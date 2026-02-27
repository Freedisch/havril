# Havril

**Model-agnostic memory service for AI.** One memory layer for all your AI models — chat on Claude, switch to ChatGPT, open Gemini. Your context follows.

Havril is not a chat interface. It is a pure backend memory layer that plugs into AI platforms as a tool integration and works silently in the background. The intelligence lives inside Havril, not the models.

---

## How It Works

1. **Connect** — Sign up, get a Bearer token, connect your AI platforms (Claude via MCP, ChatGPT via Custom Action)
2. **Chat normally** — Use Claude.ai, ChatGPT.com, Gemini exactly as you always have
3. **Memory builds itself** — After each conversation, Havril's engine distills what matters and stores it. The model fetches it next time.

---

## Architecture

```
User chats on Claude / ChatGPT / Gemini
        │
        ▼
  Model calls Havril API
        │
        ▼
┌─────────────────────────────┐
│       Memory Engine         │
│  Extract → Deduplicate →    │
│  Contradict → Score → Store │
└─────────────────────────────┘
        │
   ┌────┴────┐
   ▼         ▼
PostgreSQL  Qdrant
(metadata)  (vectors)
```

When a conversation ends, the model calls `POST /v1/memory/submit` with the raw transcript. Havril's Memory Engine processes it through a 5-step pipeline: extract facts via LLM, deduplicate against existing vectors, resolve contradictions, score importance, and store in PostgreSQL + Qdrant. Before the model responds next time, it calls `GET /v1/memory/fetch` to retrieve semantically relevant memories.

---

## Tech Stack

| Layer        | Technology                    |
|--------------|-------------------------------|
| Language     | Go 1.22+                      |
| HTTP Router  | Chi                           |
| Database     | PostgreSQL 15+ (pgx/v5)       |
| Vector Store | Qdrant (gRPC)                 |
| Cache / Rate | Redis                         |
| Embeddings   | OpenAI text-embedding-3-small |
| Engine LLM   | OpenAI gpt-4o-mini            |
| Auth         | Bearer token (SHA-256 hashed) |

---

## Project Structure

```
havril/
├── cmd/server/              # Entrypoint
├── internal/
│   ├── api/                 # HTTP handlers, middleware, router
│   ├── engine/              # Memory Engine pipeline
│   ├── memory/              # Service + repository
│   ├── embedding/           # Embedder interface + OpenAI impl
│   ├── store/               # PostgreSQL + Qdrant clients
│   ├── mcp/                 # MCP server for Claude
│   └── user/                # Auth service + repository
├── pkg/
│   ├── models/              # Shared domain structs
│   └── config/              # Env var loading
├── website/                 # Landing page (Next.js)
├── migrations/              # SQL migration files
├── docker-compose.yml
└── Makefile
```

---

## API

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint             | Auth   | Description                          |
|--------|----------------------|--------|--------------------------------------|
| POST   | `/v1/auth/register`  | Public | Create account, returns token        |
| POST   | `/v1/auth/login`     | Public | Login, returns token                 |
| POST   | `/v1/models/connect` | Bearer | Register a connected AI platform     |
| GET    | `/v1/models`         | Bearer | List connected platforms             |
| DELETE | `/v1/models/:id`     | Bearer | Disconnect a platform                |
| POST   | `/v1/memory/submit`  | Bearer | Submit conversation to Memory Engine |
| GET    | `/v1/memory/fetch`   | Bearer | Fetch relevant memories for a query  |
| GET    | `/v1/memory/:id`     | Bearer | Get a single memory                  |
| DELETE | `/v1/memory/:id`     | Bearer | Delete a memory                      |
| GET    | `/v1/memory`         | Bearer | List all memories                    |
| GET    | `/v1/health`         | Public | Health check                         |
| MCP    | `/mcp`               | Bearer | MCP server for Claude                |

---

## Getting Started

### Prerequisites

- Go 1.22+
- Docker & Docker Compose
- OpenAI API key

### Setup

```bash
# Clone the repo
git clone https://github.com/Freedisch/synapseai.git
cd synapseai

# Start infrastructure
make docker-up    # PostgreSQL, Qdrant, Redis

# Run migrations
make migrate

# Set environment variables
export DATABASE_URL="postgres://..."
export QDRANT_HOST="localhost:6334"
export REDIS_URL="redis://localhost:6379"
export OPENAI_API_KEY="sk-..."

# Start the server
make run
```

### Development Commands

```bash
make docker-up    # Start postgres, qdrant, redis
make migrate      # Run SQL migrations
make run          # Start the API server
make test         # Run all tests
make build        # Build binary
```

### Website (Landing Page)

```bash
cd website
npm install
npm run dev
```

---

## Memory Engine Pipeline

Every conversation passes through 5 steps:

1. **Extract** — LLM identifies meaningful facts from the transcript
2. **Deduplicate** — Vector similarity check (threshold 0.92) prevents storing duplicates
3. **Contradict** — Detects and supersedes outdated memories automatically
4. **Score** — Importance weighted by hint (0.6) + specificity bonus (0.4)
5. **Store** — Written to PostgreSQL + Qdrant with synced UUIDs

---

## Roadmap

- [x] Project scaffold, docker-compose, migrations
- [ ] User auth (register, login, token middleware)
- [ ] Connected models CRUD
- [ ] Embedding service
- [ ] Memory repository (PostgreSQL + Qdrant sync)
- [ ] Memory service + basic HTTP endpoints
- [ ] Memory Engine (extractor, deduplicator, classifier, scorer)
- [ ] Core endpoints (submit, fetch)
- [ ] MCP server (Claude native integration)
- [ ] Rate limiting + integration tests

---

## License

MIT
