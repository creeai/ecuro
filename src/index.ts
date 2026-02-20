// ============================================================
// Ecuro Light MCP Server v2 - Main Entry Point
// ============================================================
//
// Servidor MCP para integração com a API Ecuro Light
// Sistema de Agendamento Odontológico - 22 tools
//
// Transports suportados:
//   - stdio  (padrão) → para uso local com Claude Desktop, Cursor, etc.
//   - http   → para uso remoto via Streamable HTTP
//
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { randomUUID } from "crypto";

import { registerAppointmentTools } from "./tools/appointments.js";
import { registerAvailabilityTools } from "./tools/availability.js";
import { registerPatientTools } from "./tools/patients.js";
import { registerClinicTools } from "./tools/clinics.js";

import { TOOL_COUNT } from "./constants.js";

// ── Helper: cria e configura um McpServer com todas as tools ──
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "2.0.0",
  });
  registerAppointmentTools(server);   // 7 tools
  registerAvailabilityTools(server);  // 4 tools
  registerPatientTools(server);       // 6 tools
  registerClinicTools(server);        // 5 tools
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

// ── Transport: Streamable HTTP (com sessões) ─────────────────
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Armazena sessões ativas: sessionId → transport
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  // Health check — responde em / e /health
  const healthResponse = {
    status: "ok",
    server: "ecuro-mcp-server",
    version: "2.0.0",
    tools: TOOL_COUNT,
  };
  app.get("/", (_req: Request, res: Response) => { res.json(healthResponse); });
  app.get("/health", (_req: Request, res: Response) => { res.json(healthResponse); });

  // ── POST /mcp — Recebe mensagens JSON-RPC do MCP ───────────
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      // Sessão existente → reutiliza
      if (sessionId && sessions.has(sessionId)) {
        const transport = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // SessionId inválido → rejeita
      if (sessionId && !sessions.has(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Send initialize first." },
          id: null,
        });
        return;
      }

      // Nova sessão
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

  // ── GET /mcp — SSE stream ──────────────────────────────────
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

  // ── DELETE /mcp — Encerra sessão ───────────────────────────
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
