// ============================================================
// Ecuro Light MCP Server - Main Entry Point
// ============================================================
//
// Servidor MCP para integração com a API Ecuro Light
// Sistema de Agendamento Odontológico
//
// Transports suportados:
//   - stdio  (padrão) → para uso local com Claude Desktop, Cursor, etc.
//   - http   → para uso remoto via Streamable HTTP
//
// Uso:
//   TRANSPORT=stdio  node dist/index.js   (ou apenas node dist/index.js)
//   TRANSPORT=http   node dist/index.js
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
import { registerDentistTools } from "./tools/dentists.js";

// ── Helper: cria e configura um McpServer com todas as tools ──
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "1.0.0",
  });
  registerAppointmentTools(server);
  registerAvailabilityTools(server);
  registerPatientTools(server);
  registerDentistTools(server);
  return server;
}

// ── Transport: stdio ─────────────────────────────────────────
async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Ecuro MCP Server - 9 tools registradas");
  console.error("🚀 Ecuro MCP Server rodando via stdio");
}

// ── Transport: Streamable HTTP (com sessões) ─────────────────
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Armazena sessões ativas: sessionId → transport
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  // Health check — responde em / e /health
  const healthResponse = { status: "ok", server: "ecuro-mcp-server", version: "1.0.0", tools: 9 };
  app.get("/", (_req: Request, res: Response) => { res.json(healthResponse); });
  app.get("/health", (_req: Request, res: Response) => { res.json(healthResponse); });

  // ── POST /mcp — Recebe mensagens JSON-RPC do MCP ───────────
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      // Verifica se já existe uma sessão
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        // Sessão existente — reutiliza o transport
        const transport = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Nova sessão — se veio um sessionId que não existe, rejeita
      if (sessionId && !sessions.has(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Send initialize first." },
          id: null,
        });
        return;
      }

      // Cria nova sessão
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
      });

      // Cria um novo McpServer para esta sessão
      const server = createMcpServer();
      await server.connect(transport);

      // Guarda a sessão
      const newSessionId = transport.sessionId;
      if (newSessionId) {
        sessions.set(newSessionId, transport);
        console.error(`📌 Nova sessão MCP: ${newSessionId}`);
      }

      // Limpa sessão quando o transport fechar
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

  // ── GET /mcp — SSE stream (opcional, para notificações) ────
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
    console.error("✅ Ecuro MCP Server - 9 tools registradas");
    console.error(`🚀 Ecuro MCP Server rodando em http://0.0.0.0:${port}/mcp`);
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
