# Havril

— Claude Code Context

## What This Project Is

Havril
is a **model-agnostic memory service** written in Go. It gives AI models (Claude,
ChatGPT, Gemini, Mistral, etc.) the ability to remember users persistently across
conversations — regardless of which platform they use.

**Havril
is not a chat interface.** It is a pure backend memory layer. Users keep chatting
on Claude.ai, ChatGPT.com, Gemini, etc. exactly as they do today. Havril
plugs into those
platforms as a tool integration and works silently in the background.

**The intelligence lives inside Havril
, not the models.** Models are delivery pipes — they
submit raw conversations and receive distilled memories back. Havril
's Memory Engine decides
what is worth keeping, how important it is, and how to reconcile it with existing knowledge.

---

## Architecture in One Paragraph

Users sign up, get a Bearer token, and connect their AI platforms (Claude via MCP, ChatGPT
via Custom Action). When a model conversation ends, the model calls `POST /v1/memory/submit`
with the raw transcript. Havril
's Memory Engine processes it: extract facts with an internal
LLM → deduplicate against Qdrant → resolve contradictions → score importance → store in
PostgreSQL + Qdrant. Before the model responds next time, it calls `GET /v1/memory/fetch?q=...`
and Havril
returns the top semantically-relevant memories for that user.

---

## Tech Stack

| Layer        | Technology                         |
| ------------ | ---------------------------------- |
| Language     | Go 1.22+                           |
| HTTP Router  | Chi                                |
| Database     | PostgreSQL 15+ (pgx/v5)            |
| Vector Store | Qdrant (gRPC client)               |
| Cache / Rate | Redis                              |
| Embeddings   | OpenAI text-embedding-3-small      |
| Engine LLM   | OpenAI gpt-4o-mini (internal only) |
| MCP Server   | Go MCP server                      |
| Auth         | Bearer token (SHA-256 hash stored) |

---

## Project Structure

```
Havril
/
├── cmd/server/              # main.go — entrypoint, wires everything together
├── internal/
│   ├── api/
│   │   ├── handler/
│   │   │   ├── memory.go    # submit, fetch, get, delete, list
│   │   │   ├── models.go    # connect, disconnect, list
│   │   │   ├── auth.go      # register, login
│   │   │   └── health.go
│   │   ├── middleware/
│   │   │   ├── auth.go      # token validation → injects userID into ctx
│   │   │   └── ratelimit.go # Redis sliding window
│   │   └── router.go
│   ├── engine/              # Memory Engine — core intelligence
│   │   ├── engine.go        # ProcessConversation — orchestrates pipeline
│   │   ├── extractor.go     # LLM-based fact extraction → []Candidate
│   │   ├── deduplicator.go  # Qdrant similarity check, threshold 0.92
│   │   ├── classifier.go    # validates/normalises memory type
│   │   └── scorer.go        # importance score computation
│   ├── memory/
│   │   ├── service.go       # MemoryService interface + implementation
│   │   └── repository.go    # all PostgreSQL + Qdrant memory queries
│   ├── embedding/
│   │   ├── embedding.go     # Embedder interface
│   │   ├── openai.go        # OpenAI text-embedding-3-small
│   │   └── local.go         # stub for local fallback (Ollama)
│   ├── store/
│   │   ├── postgres/        # DB connection pool, migration runner
│   │   └── vector/          # Qdrant gRPC client wrapper
│   ├── mcp/
│   │   └── server.go        # MCP server exposing fetch_memories + submit_conversation
│   └── user/
│       ├── service.go       # Register, Login, ValidateToken
│       └── repository.go    # users + connected_models queries
├── pkg/
│   ├── models/              # shared domain structs (User, Memory, ConnectedModel, etc.)
│   └── config/              # env var loading with validation
├── migrations/              # SQL files: 001_users, 002_connected_models, 003_memories, 004_indexes
├── docker-compose.yml       # postgres, qdrant, redis, api
└── Makefile                 # run, migrate, test, build, docker-up
```

---

## Database Schema

### users

```sql
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,          -- bcrypt cost 12
  token_hash    TEXT        UNIQUE,            -- SHA-256 of bearer token
  token_prefix  TEXT,                          -- first 8 chars for display
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);
```

### connected_models

```sql
CREATE TABLE connected_models (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT        NOT NULL,  -- anthropic | openai | google | mistral | other
  integration  TEXT        NOT NULL,  -- mcp | custom_action | browser_ext
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);
```

### memories

```sql
CREATE TABLE memories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('semantic','episodic','procedural','summary')),
  importance    FLOAT       NOT NULL DEFAULT 0.5,
  source_model  TEXT,
  tags          TEXT[]      NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  access_count  INTEGER     NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Required indexes
CREATE INDEX idx_memories_user_id   ON memories(user_id);
CREATE INDEX idx_memories_active    ON memories(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_memories_importance ON memories(user_id, importance DESC);
CREATE INDEX idx_memories_created   ON memories(user_id, created_at DESC);
CREATE INDEX idx_users_token_hash   ON users(token_hash);
```

### Qdrant collection

```
Collection: "memories"
  vectors:  { size: 1536, distance: Cosine }
  payload:  { user_id: string, type: string, is_active: bool }
```

Every Qdrant search MUST filter by `user_id`. Never search across users.
Memory UUID is used as the Qdrant point ID — they are always kept in sync.

---

## Core Interfaces

```go
// pkg/models/memory.go
type Memory struct {
    ID           string
    UserID       string
    Content      string
    Type         string  // semantic | episodic | procedural | summary
    Importance   float64
    SourceModel  string
    Tags         []string
    IsActive     bool
    AccessCount  int
    LastAccessed *time.Time
    ExpiresAt    *time.Time
    CreatedAt    time.Time
}

// internal/memory/service.go
type MemoryService interface {
    Submit(ctx context.Context, userID string, req SubmitRequest) (*SubmitResult, error)
    Fetch(ctx context.Context, userID string, query string, limit int) ([]*Memory, error)
    GetByID(ctx context.Context, id, userID string) (*Memory, error)
    List(ctx context.Context, userID string) ([]*Memory, error)
    Delete(ctx context.Context, id, userID string) error
}

// internal/embedding/embedding.go
type Embedder interface {
    Embed(ctx context.Context, text string) ([]float32, error)
}

// internal/engine/engine.go
type EngineResult struct {
    MemoriesCreated int
    MemoriesUpdated int
}
```

---

## API Endpoints

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint           | Auth   | Description                              |
| ------ | ------------------ | ------ | ---------------------------------------- |
| POST   | /v1/auth/register  | Public | Create account, returns token (once)     |
| POST   | /v1/auth/login     | Public | Login, returns token                     |
| POST   | /v1/models/connect | Bearer | Register a connected AI platform         |
| GET    | /v1/models         | Bearer | List connected platforms                 |
| DELETE | /v1/models/:id     | Bearer | Disconnect a platform                    |
| POST   | /v1/memory/submit  | Bearer | Submit conversation to Memory Engine     |
| GET    | /v1/memory/fetch   | Bearer | Fetch relevant memories for a query      |
| GET    | /v1/memory/:id     | Bearer | Get a single memory by ID                |
| DELETE | /v1/memory/:id     | Bearer | Hard delete a memory (postgres + qdrant) |
| GET    | /v1/memory         | Bearer | List all memories for user               |
| GET    | /v1/health         | Public | Health check                             |
| MCP    | /mcp               | Bearer | MCP server (Claude native integration)   |

### POST /v1/memory/submit

```json
{
  "conversation": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "source_model": "claude-sonnet-4"
}
```

Response: `{ "memories_created": 2, "memories_updated": 1 }`

### GET /v1/memory/fetch

Query params: `q` (required), `limit` (optional, default 5, max 20)

Ranking formula: `score = (cosine_similarity × 0.5) + (importance × 0.3) + (recency_factor × 0.2)`
where `recency_factor = 1.0 / (1.0 + days_since_created)`.

Response:

```json
{
  "memories": [
    {
      "id": "uuid",
      "content": "...",
      "type": "semantic",
      "importance": 0.87,
      "tags": [],
      "created_at": "..."
    }
  ]
}
```

### Error format (all endpoints)

```json
{ "error": "human readable message", "code": "machine_readable_code" }
```

---

## Memory Engine Pipeline

`ProcessConversation(ctx, userID, conversation, sourceModel)` runs these steps in order:

1. **Extract** — call gpt-4o-mini with a structured prompt; parse JSON array of candidates:
   `{ content, type, importance_hint (0-1), tags }`
2. **Deduplicate** — embed each candidate; search Qdrant for similarity > 0.92; skip if found
3. **Contradict** — search at threshold 0.75–0.85; if conflict found, call `SetInactive` on old memory
4. **Classify** — validate/normalise `type`; default to `semantic` if missing or invalid
5. **Score** — `importance = (importance_hint × 0.6) + (specificity_bonus × 0.4)`, clamp to [0,1]
6. **Store** — write to PostgreSQL; upsert vector to Qdrant using memory UUID as point ID

---

## Auth Rules

- Raw token is returned **once** at register/login and never stored anywhere
- Only `SHA-256(token)` is persisted in `users.token_hash`
- Auth middleware: extract Bearer token → hash it → look up user → inject `userID` into context
- Every handler reads `userID` from context only — never from request body or query params
- All memory queries scope to `userID` at the repository layer

---

## Rate Limits (Redis sliding window)

| Endpoint group      | Limit             |
| ------------------- | ----------------- |
| POST /memory/submit | 60 req/hour/user  |
| GET /memory/fetch   | 300 req/hour/user |
| Auth endpoints      | 10 req/hour/IP    |

Return `429` with `Retry-After` header when exceeded.

---

## MCP Tools (Claude Integration)

```
tool: fetch_memories
  input:  { query: string, limit?: number }
  output: [{ content: string, type: string, importance: number }]

tool: submit_conversation
  input:  { conversation: Message[], source_model: string }
  output: { memories_created: number, memories_updated: number }
```

MCP server is at `/mcp`. Authentication uses the same Bearer token as the REST API.

---

## Environment Variables

```
PORT                       # default: 8080
DATABASE_URL               # PostgreSQL DSN
QDRANT_HOST                # default: localhost:6334 (gRPC)
REDIS_URL                  # Redis DSN
OPENAI_API_KEY             # for embeddings + engine LLM
ENGINE_MODEL               # default: gpt-4o-mini
EMBEDDING_MODEL            # default: text-embedding-3-small
JWT_SECRET                 # for any future session tokens
MEMORY_FETCH_LIMIT         # default: 5
DEDUP_THRESHOLD            # default: 0.92 (cosine similarity)
SUMMARIZE_THRESHOLD        # default: 200 (memories before auto-summarize)
```

---

## Development Commands

```bash
make docker-up    # start postgres, qdrant, redis
make migrate      # run SQL migrations in order
make run          # start the API server
make test         # run all tests
make build        # build binary
```

---

## Current Phase

**Phase 1 — MVP.** Build in this exact order:

- [x] Step 1: Project scaffold, docker-compose, migrations
- [ ] Step 2: User auth (register, login, token middleware)
- [ ] Step 3: Connected models CRUD
- [ ] Step 4: Embedding service (Embedder interface + OpenAI impl)
- [ ] Step 5: Memory repository (PostgreSQL + Qdrant sync)
- [ ] Step 6: Memory service + basic HTTP endpoints (list, get, delete)
- [ ] Step 7: Memory Engine (extractor, deduplicator, classifier, scorer, orchestrator)
- [ ] Step 8: Core endpoints (POST /submit, GET /fetch)
- [ ] Step 9: MCP server
- [ ] Step 10: Rate limiting + integration tests

Do not skip steps or build out of order. Each step depends on the previous.

---

## Key Rules When Writing Code

- **Scope every query by userID.** A user must never be able to read, write, or delete another user's data.
- **Never log raw tokens or passwords.** Only log the `token_prefix` for debugging.
- **Keep the engine stateless.** `ProcessConversation` should not depend on any global state.
- **Qdrant and PostgreSQL must stay in sync.** If a memory is deleted from PostgreSQL, delete the vector from Qdrant in the same operation. Use a transaction + Qdrant call pattern.
- **Never store conversation transcripts.** The engine processes them in memory and discards. No raw conversation text should ever be written to the database.
- **Return consistent errors.** Always `{ "error": string, "code": string }` with the appropriate HTTP status.
- **Graceful degradation.** If the embedding call fails, return an error. Do not silently store a memory without its vector — it will be unsearchable.
