// ============================================================
// Ecuro Light MCP Server v2.1 - COMPATÍVEL COM CLAUDE DESKTOP
// ============================================================
//
// Servidor MCP para integração com a API Ecuro Light
// Sistema de Agendamento Odontológico - 27 tools
//
// ✅ MODO HTTP DUPLO:
//    - /mcp → Streamable HTTP (sessões) - modo original
//    - /sse → SSE compatível com npx mcp-remote
//
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { randomUUID } from "crypto";

import { registerAppointmentTools } from "./tools/appointments.js";
import { registerAvailabilityTools } from "./tools/availability.js";
import { registerPatientTools } from "./tools/patients.js";
import { registerClinicTools } from "./tools/clinics.js";
import { registerCommunicationTools } from "./tools/communications.js";

import { TOOL_COUNT } from "./constants.js";

// ── Helper: cria e configura um McpServer com todas as tools ──
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "2.1.0",
  });
  registerAppointmentTools(server);    // 8 tools
  registerAvailabilityTools(server);   // 4 tools
  registerPatientTools(server);        // 7 tools
  registerClinicTools(server);         // 7 tools
  registerCommunicationTools(server);  // 1 tool
  return server;
}

// ── Transport: stdio ─────────────────────────────────────────
async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ Ecuro MCP Server v2.1 - ${TOOL_COUNT} tools registradas`);
  console.error("🚀 Rodando via stdio");
}

// ── Transport: HTTP DUPLO ────────────────────────────────────
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());
  
  // CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Armazena sessões ativas para Streamable HTTP
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  // Health check
  const healthResponse = {
    status: "ok",
    server: "ecuro-mcp-server",
    version: "2.1.0",
    tools: TOOL_COUNT,
    endpoints: {
      "/mcp": "Streamable HTTP (sessões)",
      "/sse": "SSE (compatível com Claude Desktop)"
    }
  };
  
  app.get("/", (_req: Request, res: Response) => res.json(healthResponse));
  app.get("/health", (_req: Request, res: Response) => res.json(healthResponse));

  // ══════════════════════════════════════════════════════════
  // ENDPOINT SSE - COMPATÍVEL COM CLAUDE DESKTOP
  // ══════════════════════════════════════════════════════════
  
  app.get("/sse", async (req: Request, res: Response) => {
    console.error("📡 Nova conexão SSE");
    
    const server = createMcpServer();
    const transport = new SSEServerTransport("/message", res);
    await server.connect(transport);
    
    console.error("✅ Cliente SSE conectado");
  });

  app.post("/message", async (req: Request, res: Response) => {
    // Endpoint para receber mensagens do cliente SSE
    // O SSEServerTransport gerencia isso internamente
    res.json({ ok: true });
  });

  // ══════════════════════════════════════════════════════════
  // ENDPOINT /mcp - STREAMABLE HTTP (MODO ORIGINAL)
  // ══════════════════════════════════════════════════════════

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        const transport = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId && !sessions.has(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Send initialize first." },
          id: null,
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
      });

      const server = createMcpServer();
      await server.connect(transport);

      const newSessionId = transport.sessionId;
      if (newSessionId) {
        sessions.set(newSessionId, transport);
        console.error(`📌 Nova sessão MCP: ${newSessionId}`);
      }

      transport.onclose = () => {
        if (newSessionId) {
          sessions.delete(newSessionId);
          console.error(`🗑️  Sessão encerrada: ${newSessionId}`);
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
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
      return;
    }
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
      return;
    }
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.error(`✅ Ecuro MCP Server v2.1 - ${TOOL_COUNT} tools registradas`);
    console.error(`🚀 Rodando em http://0.0.0.0:${port}`);
    console.error(`📡 Endpoint SSE (Claude Desktop): http://0.0.0.0:${port}/sse`);
    console.error(`🔄 Endpoint MCP (Streamable): http://0.0.0.0:${port}/mcp`);
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
