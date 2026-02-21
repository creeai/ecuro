// ============================================================
// Ecuro Light MCP Server v2 - Main Entry Point (DEBUG CORS)
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
import { registerCommunicationTools } from "./tools/communications.js";

import { TOOL_COUNT } from "./constants.js";

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "2.0.0",
  });
  registerAppointmentTools(server);
  registerAvailabilityTools(server);
  registerPatientTools(server);
  registerClinicTools(server);
  registerCommunicationTools(server);
  return server;
}

async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ Ecuro MCP Server v2 - ${TOOL_COUNT} tools registradas`);
  console.error("🚀 Rodando via stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();

  // ── CORS MIDDLEWARE (PRIMEIRA COISA!) ─────────────────────
  app.use((req: Request, res: Response, next) => {
    console.error(`🔍 CORS Middleware: ${req.method} ${req.path}`);
    console.error(`🔍 Origin: ${req.headers.origin || 'none'}`);
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
    res.header('Access-Control-Expose-Headers', 'mcp-session-id');
    
    console.error(`✅ CORS Headers adicionados!`);
    
    if (req.method === 'OPTIONS') {
      console.error(`✅ Respondendo OPTIONS com 200`);
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const healthResponse = {
    status: "ok",
    server: "ecuro-mcp-server",
    version: "2.0.0",
    tools: TOOL_COUNT,
  };
  
  app.get("/", (_req: Request, res: Response) => { 
    console.error("✅ GET / - Health check");
    res.json(healthResponse); 
  });
  
  app.get("/health", (_req: Request, res: Response) => { 
    console.error("✅ GET /health");
    res.json(healthResponse); 
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    console.error(`📥 POST /mcp recebido`);
    console.error(`📥 Headers: ${JSON.stringify(req.headers)}`);
    console.error(`📥 Body: ${JSON.stringify(req.body)}`);
    
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        console.error(`♻️  Reutilizando sessão: ${sessionId}`);
        const transport = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId && !sessions.has(sessionId)) {
        console.error(`❌ Sessão inválida: ${sessionId}`);
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Send initialize first." },
          id: null,
        });
        return;
      }

      console.error(`🆕 Criando nova sessão...`);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
      });

      const server = createMcpServer();
      await server.connect(transport);

      const newSessionId = transport.sessionId;
      if (newSessionId) {
        sessions.set(newSessionId, transport);
        console.error(`📌 Nova sessão criada: ${newSessionId}`);
      }

      transport.onclose = () => {
        if (newSessionId) {
          sessions.delete(newSessionId);
          console.error(`🗑️  Sessão encerrada: ${newSessionId}`);
        }
      };

      console.error(`📤 Enviando resposta...`);
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
    console.error(`✅ Ecuro MCP Server v2 - ${TOOL_COUNT} tools registradas`);
    console.error(`🚀 Rodando em http://0.0.0.0:${port}/mcp`);
    console.error(`🔍 CORS habilitado para todos os origins`);
  });
}

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
