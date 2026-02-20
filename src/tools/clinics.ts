// ============================================================
// Ecuro Light MCP Server v2 - Clinics, Reports & Finance (7 tools)
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import {
  ListClinicsSchema,
  ListSpecialtiesSchema,
  ActiveDentistsSchema,
  ApiReportSchema,
  ListBoletosSchema,
  ExportCsvSchema,
  GetClinicLogoSchema,
} from "../schemas/index.js";

export function registerClinicTools(server: McpServer): void {
  // ── 18. Listar clínicas ─────────────────────────────────────
  server.registerTool(
    "ecuro_list_clinics",
    {
      title: "Listar Clínicas",
      description: `Retorna lista de clínicas cadastradas no sistema.
Se clinicId fornecido, retorna apenas os dados dessa clínica (nome, ID, endereço, código público).`,
      inputSchema: ListClinicsSchema,
    },
    async (params) => {
      const query: Record<string, unknown> = {};
      if (params.clinicId) query.clinicId = params.clinicId;
      const result = await ecuroApi.get("/list-clinics", query);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 19. Listar especialidades ───────────────────────────────
  server.registerTool(
    "ecuro_list_specialties",
    {
      title: "Listar Especialidades",
      description: `Retorna todas as especialidades médicas/odontológicas disponíveis no sistema com seus IDs e nomes.`,
      inputSchema: ListSpecialtiesSchema,
    },
    async () => {
      const result = await ecuroApi.get("/list-specialties");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 20. Dentistas ativos da clínica ─────────────────────────
  server.registerTool(
    "ecuro_active_dentists",
    {
      title: "Dentistas Ativos da Clínica",
      description: `Retorna lista de todos os dentistas ativos trabalhando na clínica especificada.
Inclui: ID, nome, especialidades e dados do profissional.`,
      inputSchema: ActiveDentistsSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/active-dentists", {
        clinicId: params.clinicId,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 21. Relatório CSV de consultas ──────────────────────────
  server.registerTool(
    "ecuro_api_report",
    {
      title: "Relatório de Consultas",
      description: `Gera relatório detalhado de consultas com dados financeiros.

Inclui: dados da clínica, paciente (CPF, tel, canal), saldo financeiro (pagamentos, aprovados, executados, oportunidades), consulta (status, dentista, campanhas, notas, comentários).

Padrão: últimos 31 dias, apenas consultas da API. nonApiExclusive=true para todas.
Máximo: 31 dias entre startDate e endDate.`,
      inputSchema: ApiReportSchema,
    },
    async (params) => {
      const result = await ecuroApi.get("/apireport", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 22. Listar boletos ──────────────────────────────────────
  server.registerTool(
    "ecuro_list_boletos",
    {
      title: "Listar Boletos",
      description: `Lista boletos da clínica com filtros avançados e links FitBank para PDFs.

Filtros: patientId, dentistId, status (CREATED, REGISTERED, SETTLEMENT, CANCELLED, etc), dueSoon (today/week/month), overdue, valor mín/máx.

Paginado. Retorna: valor, vencimento, status, nome do paciente e links para download do PDF do boleto.`,
      inputSchema: ListBoletosSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/list-boletos", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 23. Exportar relatório CSV ────────────────────────────────
  server.registerTool(
    "ecuro_export_csv",
    {
      title: "Exportar Relatório CSV",
      description: `Exporta relatório de consultas em formato CSV.

IMPORTANTE: Disponível apenas entre 20h-8h BRT (fora do horário comercial).

Inclui: consultas, status, pacientes, valores aprovados, pagamentos, dados da clínica, canal de origem.
Por padrão retorna apenas consultas da API. nonApiExclusive=true para todas.
clinicId é obrigatório.`,
      inputSchema: ExportCsvSchema,
    },
    async (params) => {
      const result = await ecuroApi.getText("/csv", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ── 24. Buscar logo da clínica ────────────────────────────────
  server.registerTool(
    "ecuro_get_clinic_logo",
    {
      title: "Buscar Logo da Clínica",
      description: `Retorna o logo da clínica em formato base64 (data URI).

logoId é o UUID do arquivo de logo, obtido nos dados da clínica via ecuro_list_clinics.
Suporta PNG e JPEG. Retorna: data:image/png;base64,...`,
      inputSchema: GetClinicLogoSchema,
    },
    async (params) => {
      const result = await ecuroApi.getBinary(`/logo/${params.logoId}`);
      return { content: [{ type: "text", text: result }] };
    }
  );
}
