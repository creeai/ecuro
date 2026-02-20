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
import express from "express";

import { registerAppointmentTools } from "./tools/appointments.js";
import { registerAvailabilityTools } from "./tools/availability.js";
import { registerPatientTools } from "./tools/patients.js";
import { registerDentistTools } from "./tools/dentists.js";

// ── Inicializar servidor MCP ─────────────────────────────────
const server = new McpServer({
  name: "ecuro-mcp-server",
  version: "1.0.0",
});

// ── Registrar todas as tools ─────────────────────────────────
registerAppointmentTools(server);
registerAvailabilityTools(server);
registerPatientTools(server);
registerDentistTools(server);

console.error("✅ Ecuro MCP Server - 9 tools registradas");

// ── Transport: stdio ─────────────────────────────────────────
async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Ecuro MCP Server rodando via stdio");
}

// ── Transport: Streamable HTTP ───────────────────────────────
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "ecuro-mcp-server", version: "1.0.0" });
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(`🚀 Ecuro MCP Server rodando em http://localhost:${port}/mcp`);
  });
}

// ── Selecionar transport e iniciar ───────────────────────────
const transport = process.env.TRANSPORT || "stdio";

if (transport === "http") {
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
