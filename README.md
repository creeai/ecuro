# 🦷 Ecuro MCP Server

Servidor MCP (Model Context Protocol) para integração com a **API Ecuro Light** — Sistema de Agendamento Odontológico.

Substitui o workflow n8n por um servidor MCP standalone em TypeScript, pronto para usar com **Claude Desktop**, **Cursor**, **Claude Code** ou qualquer cliente MCP.

---

## 🛠️ Tools Disponíveis (9 tools)

| Tool | Descrição |
|------|-----------|
| `ecuro_create_appointment` | Criar agendamento de avaliação |
| `ecuro_create_appointment_for_doctor` | Criar agendamento com dentista específico |
| `ecuro_search_availability` | Buscar horários disponíveis na agenda |
| `ecuro_specialty_availability` | Disponibilidade por especialidade/dentista |
| `ecuro_dentist_availability` | Disponibilidade detalhada de um dentista |
| `ecuro_get_patient_by_phone` | Buscar paciente por telefone |
| `ecuro_get_dentist_by_name` | Buscar dentista por nome (Supabase) |
| `ecuro_get_dentist_by_speciality` | Buscar dentista por especialidade (Supabase) |
| `ecuro_get_dentist_for_assessment` | Listar dentistas de avaliação (Supabase) |

---

## 🚀 Instalação

```bash
# 1. Clone ou copie o projeto
cd ecuro-mcp-server

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com seus tokens

# 4. Build
npm run build

# 5. Rodar
npm start
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `ECURO_ACCESS_TOKEN` | ✅ | Token `app-access-token` da API Ecuro |
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_KEY` | ✅ | Chave de serviço do Supabase |
| `ECURO_API_BASE_URL` | ❌ | URL base da API (padrão: produção) |
| `TRANSPORT` | ❌ | `stdio` (padrão) ou `http` |
| `PORT` | ❌ | Porta HTTP (padrão: 3000) |

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "ecuro": {
      "command": "node",
      "args": ["/caminho/para/ecuro-mcp-server/dist/index.js"],
      "env": {
        "ECURO_ACCESS_TOKEN": "seu_token_aqui",
        "SUPABASE_URL": "https://seu-projeto.supabase.co",
        "SUPABASE_KEY": "sua_chave_aqui"
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "ecuro": {
      "command": "node",
      "args": ["/caminho/para/ecuro-mcp-server/dist/index.js"],
      "env": {
        "ECURO_ACCESS_TOKEN": "seu_token_aqui",
        "SUPABASE_URL": "https://seu-projeto.supabase.co",
        "SUPABASE_KEY": "sua_chave_aqui"
      }
    }
  }
}
```

### Modo HTTP (remoto)

```bash
TRANSPORT=http PORT=3000 npm start
```

O servidor ficará disponível em `http://localhost:3000/mcp`.

---

## 📁 Estrutura do Projeto

```
ecuro-mcp-server/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── index.ts              # Entry point + transports
│   ├── constants.ts          # Configurações e constantes
│   ├── types.ts              # Interfaces TypeScript
│   ├── schemas/
│   │   └── index.ts          # Schemas Zod de validação
│   ├── services/
│   │   ├── ecuroApi.ts       # Client HTTP para API Ecuro
│   │   └── supabase.ts       # Client Supabase
│   └── tools/
│       ├── appointments.ts   # Tools de agendamento
│       ├── availability.ts   # Tools de disponibilidade
│       ├── patients.ts       # Tools de pacientes
│       └── dentists.ts       # Tools de dentistas (Supabase)
└── dist/                     # Build (gerado)
```

---

## 🔄 Mapeamento n8n → MCP

| Node n8n | Tool MCP |
|----------|----------|
| `create_appointment` | `ecuro_create_appointment` |
| `create_appointment_for_specific_professional` | `ecuro_create_appointment_for_doctor` |
| `search-availability` | `ecuro_search_availability` |
| `especialty-availability` | `ecuro_specialty_availability` |
| `dentist-aviabilty` | `ecuro_dentist_availability` |
| `get-patient-by-phone` | `ecuro_get_patient_by_phone` |
| `get_dentist_by_name` | `ecuro_get_dentist_by_name` |
| `get_dentist_by_speciality` | `ecuro_get_dentist_by_speciality` |
| `get_dentist_by_speciality_of_assessment` | `ecuro_get_dentist_for_assessment` |

---

## 🧪 Testando

```bash
# Testar com MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```
