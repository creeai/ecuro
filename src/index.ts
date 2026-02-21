// ============================================================
// Ecuro Light MCP Server v2 - CORS FIX for Claude.ai
// ============================================================
//
// CORREÇÃO: CORS via middleware Express simples (sem interceptar writeHead)
//
// Suporta:
//   - Streamable HTTP (POST /mcp) → Claude.ai, Claude Desktop
//   - SSE (GET /sse + POST /messages) → n8n
//   - stdio → uso local
//
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

import { registerAppointmentTools } from "./tools/appointments.js";
import { registerAvailabilityTools } from "./tools/availability.js";
import { registerPatientTools } from "./tools/patients.js";
import { registerClinicTools } from "./tools/clinics.js";

const TOOL_COUNT = 27;

// ── Helper: cria e configura um McpServer com todas as tools ──
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "2.0.0",
  });
  registerAppointmentTools(server);
  registerAvailabilityTools(server);
  registerPatientTools(server);
  registerClinicTools(server);
  return server;
}

// ── Transport: stdio ─────────────────────────────────────────
async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ Ecuro MCP Server v2 - ${TOOL_COUNT} tools registradas`);
  console.error("🚀 Rodando via stdio");
}

// ── Transport: HTTP (Streamable HTTP + SSE) ──────────────────
async function runHTTP(): Promise<void> {
  const app = express();

  // ═══════════════════════════════════════════════════════════
  // CORS MIDDLEWARE - DEVE VIR ANTES DE TUDO
  // ═══════════════════════════════════════════════════════════
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Setar CORS headers em TODAS as respostas
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id, Last-Event-ID");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    // Responder OPTIONS (preflight) imediatamente
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    next();
  });

  app.use(express.json());

  // ═══════════════════════════════════════════════════════════
  // Streamable HTTP sessions
  // ═══════════════════════════════════════════════════════════
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

  // ═══════════════════════════════════════════════════════════
  // SSE sessions (para n8n)
  // ═══════════════════════════════════════════════════════════
  const sseSessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

  // ── Health check ───────────────────────────────────────────
  const healthResponse = {
    status: "ok",
    server: "ecuro-mcp-server",
    version: "2.0.0",
    tools: TOOL_COUNT,
    transports: ["streamable-http", "sse"],
  };
  app.get("/", (_req: Request, res: Response) => { res.json(healthResponse); });
  app.get("/health", (_req: Request, res: Response) => { res.json(healthResponse); });

  // ═══════════════════════════════════════════════════════════
  // STREAMABLE HTTP TRANSPORT (POST/GET/DELETE /mcp)
  // Para: Claude.ai, Claude Desktop
  // ═══════════════════════════════════════════════════════════

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      // Sessão existente → reutilizar transport
      if (sessionId && streamableSessions.has(sessionId)) {
        const transport = streamableSessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Sessão inválida → erro
      if (sessionId && !streamableSessions.has(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Send initialize first." },
          id: null,
        });
        return;
      }

      // Nova sessão → criar novo McpServer + Transport
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
      });

      const server = createMcpServer();
      await server.connect(transport);

      const newSessionId = transport.sessionId;
      if (newSessionId) {
        streamableSessions.set(newSessionId, transport);
        console.error(`📌 [Streamable] Nova sessão: ${newSessionId}`);
      }

      transport.onclose = () => {
        if (newSessionId) {
          streamableSessions.delete(newSessionId);
          console.error(`🗑️  [Streamable] Sessão encerrada: ${newSessionId}`);
        }
      };

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("❌ Erro no POST /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !streamableSessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
      return;
    }
    const transport = streamableSessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !streamableSessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
      return;
    }
    const transport = streamableSessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // ═══════════════════════════════════════════════════════════
  // SSE TRANSPORT (GET /sse + POST /messages)
  // Para: n8n MCP Client
  // ═══════════════════════════════════════════════════════════

  app.get("/sse", async (req: Request, res: Response) => {
    try {
      console.error("📡 [SSE] Nova conexão SSE recebida");

      const transport = new SSEServerTransport("/messages", res);
      const server = createMcpServer();

      const sessionId = transport.sessionId;
      sseSessions.set(sessionId, { transport, server });
      console.error(`📌 [SSE] Nova sessão: ${sessionId}`);

      res.on("close", () => {
        sseSessions.delete(sessionId);
        console.error(`🗑️  [SSE] Sessão encerrada: ${sessionId}`);
      });

      await server.connect(transport);
    } catch (error) {
      console.error("❌ Erro no GET /sse:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to establish SSE connection" });
      }
    }
  });

  app.post("/messages", async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        res.status(400).json({ error: "Missing sessionId query parameter" });
        return;
      }

      const session = sseSessions.get(sessionId);
      if (!session) {
        res.status(400).json({ error: "Invalid session ID. Connect to /sse first." });
        return;
      }

      await session.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error("❌ Erro no POST /messages:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // ── Iniciar servidor ───────────────────────────────────────
  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.error(`✅ Ecuro MCP Server v2 - ${TOOL_COUNT} tools registradas`);
    console.error(`🚀 Rodando em http://0.0.0.0:${port}/mcp`);
  });
}

// ── Selecionar transport e iniciar ───────────────────────────
const transportMode = process.env.TRANSPORT || "stdio";

if (transportMode === "http") {
  runHTTP().catch((error) => {
    console.error("❌ Erro no servidor HTTP:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("❌ Erro no servidor stdio:", error);
    process.exit(1);
  });
}
