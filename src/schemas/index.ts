// ============================================================
// Ecuro Light MCP Server v2.1 - COMPATÍVEL COM CLAUDE.AI WEB
// ============================================================
//
// Servidor MCP para integração com a API Ecuro Light
// Sistema de Agendamento Odontológico - 22 tools
//
// ✅ CORRIGIDO: Funciona com Claude.ai Web (sem sessões)
// ✅ CORRIGIDO: HTTP POST stateless
//
// Transports suportados:
//   - stdio  (padrão) → para uso local com Claude Desktop, Cursor, etc.
//   - http   → para uso remoto via Claude.ai Web
//
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response } from "express";
import cors from "cors";

import { registerAppointmentTools } from "./tools/appointments.js";
import { registerAvailabilityTools } from "./tools/availability.js";
import { registerPatientTools } from "./tools/patients.js";
import { registerClinicTools } from "./tools/clinics.js";

import { TOOL_COUNT } from "./constants.js";

// ── Helper: cria e configura um McpServer com todas as tools ──
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "2.1.0",
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
  console.error(`✅ Ecuro MCP Server v2.1 - ${TOOL_COUNT} tools registradas`);
  console.error("🚀 Rodando via stdio");
}

// ── Transport: HTTP STATELESS (compatível com Claude.ai) ────
async function runHTTP(): Promise<void> {
  const app = express();
  
  // CORS para permitir Claude.ai
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  }));
  
  app.use(express.json());

  // Health check
  const healthResponse = {
    status: "ok",
    server: "ecuro-mcp-server",
    version: "2.1.0",
    tools: TOOL_COUNT,
    compatibility: "claude.ai-web",
  };
  
  app.get("/", (_req: Request, res: Response) => { 
    res.json(healthResponse); 
  });
  
  app.get("/health", (_req: Request, res: Response) => { 
    res.json(healthResponse); 
  });

  // Servidor MCP global persistente (para HTTP stateless)
  const globalServer = createMcpServer();
  
  // Mapa de tools registradas
  const registeredTools = new Map<string, any>();
  
  // Captura as tools ao serem registradas
  const originalRegisterTool = globalServer.registerTool.bind(globalServer);
  globalServer.registerTool = function(name: string, config: any, handler: any) {
    registeredTools.set(name, { config, handler });
    return originalRegisterTool(name, config, handler);
  };
  
  // Re-registra todas as tools para capturar
  registerAppointmentTools(globalServer);
  registerAvailabilityTools(globalServer);
  registerPatientTools(globalServer);
  registerClinicTools(globalServer);

  // ── POST /mcp — Endpoint MCP Stateless ─────────────────────
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const { jsonrpc, id, method, params } = req.body;

      // Validação básica do JSON-RPC 2.0
      if (jsonrpc !== "2.0") {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" },
          id: id || null,
        });
      }

      // Roteamento de métodos MCP
      let result: unknown;

      switch (method) {
        case "initialize": {
          result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "ecuro-mcp-server",
              version: "2.1.0",
            },
          };
          break;
        }

        case "tools/list": {
          // Lista todas as ferramentas registradas
          const tools: Array<{
            name: string;
            description?: string;
            inputSchema: unknown;
          }> = [];

          for (const [name, tool] of registeredTools.entries()) {
            tools.push({
              name,
              description: tool.config.description || tool.config.title || "",
              inputSchema: tool.config.inputSchema || { type: "object", properties: {} },
            });
          }

          result = { tools };
          break;
        }

        case "tools/call": {
          const { name, arguments: args } = params || {};
          
          if (!name) {
            return res.status(400).json({
              jsonrpc: "2.0",
              error: { code: -32602, message: "Missing tool name" },
              id,
            });
          }

          const tool = registeredTools.get(name);
          if (!tool) {
            return res.status(200).json({
              jsonrpc: "2.0",
              error: { 
                code: -32601, 
                message: `Tool not found: ${name}` 
              },
              id,
            });
          }

          // Chama a ferramenta
          try {
            const toolResult = await tool.handler(args || {});
            result = toolResult;
          } catch (error: any) {
            return res.status(200).json({
              jsonrpc: "2.0",
              error: { 
                code: -32000, 
                message: error.message || "Tool execution failed" 
              },
              id,
            });
          }
          break;
        }

        case "ping": {
          result = {};
          break;
        }

        default: {
          return res.status(200).json({
            jsonrpc: "2.0",
            error: { 
              code: -32601, 
              message: `Method not found: ${method}` 
            },
            id,
          });
        }
      }

      // Resposta de sucesso
      res.json({
        jsonrpc: "2.0",
        result,
        id,
      });

    } catch (error: any) {
      console.error("❌ Erro no POST /mcp:", error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: { 
          code: -32603, 
          message: `Internal error: ${error.message}` 
        },
        id: req.body?.id || null,
      });
    }
  });

  // Inicia servidor
  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.error(`✅ Ecuro MCP Server v2.1 - ${TOOL_COUNT} tools registradas`);
    console.error(`🚀 Rodando em http://0.0.0.0:${port}/mcp`);
    console.error(`✅ Compatível com Claude.ai Web (stateless)`);
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
