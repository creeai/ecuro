// ============================================================
// Ecuro Light MCP Server v2.1 - CLAUDE.AI WEB
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response } from "express";

import { registerAppointmentTools } from "./tools/appointments.js";
import { registerAvailabilityTools } from "./tools/availability.js";
import { registerPatientTools } from "./tools/patients.js";
import { registerClinicTools } from "./tools/clinics.js";
import { registerCommunicationTools } from "./tools/communications.js";

import { TOOL_COUNT } from "./constants.js";

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecuro-mcp-server",
    version: "2.1.0",
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
  console.error(`✅ Ecuro MCP Server v2.1 - ${TOOL_COUNT} tools`);
  console.error("🚀 Rodando via stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());
  
  // CORS para Claude.ai
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Servidor MCP global (stateless)
  const mcpServer = createMcpServer();
  
  // Captura as tools registradas
  const toolsList: any[] = [];
  let toolsListCaptured = false;

  // Health check
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "ecuro-mcp-server",
      version: "2.1.0",
      tools: TOOL_COUNT,
      mode: "claude.ai-web",
    });
  });
  
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "ecuro-mcp-server",
      version: "2.1.0",
      tools: TOOL_COUNT,
      mode: "claude.ai-web",
    });
  });

  // ══════════════════════════════════════════════════════════
  // ENDPOINT /mcp - STATELESS (CLAUDE.AI WEB)
  // ══════════════════════════════════════════════════════════

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const { jsonrpc, id, method, params } = req.body;

      if (jsonrpc !== "2.0") {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
          id: id || null,
        });
      }

      let result: any;

      // Initialize
      if (method === "initialize") {
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
        
        return res.json({ jsonrpc: "2.0", result, id });
      }

      // Tools list
      if (method === "tools/list") {
        // Captura as tools na primeira chamada
        if (!toolsListCaptured) {
          const handlers = (mcpServer as any)._requestHandlers;
          
          for (const [key, handler] of handlers.entries()) {
            if (key.method === "tools/call" && handler.schema) {
              const toolName = handler.schema.params?.properties?.name?.const;
              const toolSchema = (mcpServer as any)._toolSchemas?.get(toolName);
              
              if (toolSchema) {
                toolsList.push({
                  name: toolName,
                  description: toolSchema.description || "",
                  inputSchema: toolSchema.inputSchema || { type: "object" },
                });
              }
            }
          }
          
          // Se não capturou dessa forma, tenta pelo mapa de tools
          if (toolsList.length === 0) {
            const toolsMap = (mcpServer as any)._tools || new Map();
            for (const [name, tool] of toolsMap.entries()) {
              toolsList.push({
                name,
                description: tool.description || tool.title || "",
                inputSchema: tool.inputSchema || { type: "object" },
              });
            }
          }
          
          toolsListCaptured = true;
          console.error(`📋 ${toolsList.length} tools capturadas`);
        }

        result = { tools: toolsList };
        return res.json({ jsonrpc: "2.0", result, id });
      }

      // Tools call
      if (method === "tools/call") {
        const { name, arguments: args } = params || {};
        
        if (!name) {
          return res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32602, message: "Missing tool name" },
            id,
          });
        }

        // Chama a tool via servidor interno
        try {
          // Tenta chamar pelo request handler
          const callResult = await (mcpServer as any).request({
            method: "tools/call",
            params: { name, arguments: args || {} },
          });
          
          result = callResult;
          return res.json({ jsonrpc: "2.0", result, id });
        } catch (error: any) {
          console.error(`❌ Erro ao chamar tool ${name}:`, error.message);
          return res.json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: error.message || "Tool execution failed",
            },
            id,
          });
        }
      }

      // Ping
      if (method === "ping") {
        result = {};
        return res.json({ jsonrpc: "2.0", result, id });
      }

      // Método não encontrado
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
        id,
      });

    } catch (error: any) {
      console.error("❌ Erro no POST /mcp:", error);
      return res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
        },
        id: req.body?.id || null,
      });
    }
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.error(`✅ Ecuro MCP Server v2.1 - ${TOOL_COUNT} tools`);
    console.error(`🚀 http://0.0.0.0:${port}/mcp`);
    console.error(`🌐 Modo: Claude.ai Web (stateless)`);
  });
}

const transportMode = process.env.TRANSPORT || "stdio";

if (transportMode === "http") {
  runHTTP().catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  });
}
