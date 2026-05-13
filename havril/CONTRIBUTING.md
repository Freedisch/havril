# Contributing to Havril

Havril is a model-agnostic memory service for AI platforms, written in Go.

## Prerequisites

- Go 1.22+
- Docker and Docker Compose (for PostgreSQL, Qdrant, Redis)
- An OpenAI API key (embeddings + memory extraction)
- A Google or GitHub OAuth app (for auth flow)

## Local Setup

```bash
git clone https://github.com/freedisch/havril
cd havril

# Copy and fill in environment variables
cp .env.example .env

# Start dependencies
docker compose up -d

# Run the server
go run .
```

## Environment Variables

| Variable               | Required | Default                  | Description                               |
| ---------------------- | -------- | ------------------------ | ----------------------------------------- |
| `DATABASE_URL`         | Yes      | —                        | PostgreSQL DSN (Supabase or self-hosted)  |
| `SESSION_SECRET`       | Yes      | —                        | Cookie signing secret                     |
| `GOOGLE_CLIENT_ID`     | Yes\*    | —                        | OAuth2 — Google                           |
| `GOOGLE_CLIENT_SECRET` | Yes\*    | —                        | OAuth2 — Google                           |
| `GITHUB_CLIENT_ID`     | Yes\*    | —                        | OAuth2 — GitHub                           |
| `GITHUB_CLIENT_SECRET` | Yes\*    | —                        | OAuth2 — GitHub                           |
| `OPENAI_API_KEY`       | Yes      | —                        | Used for embeddings and extraction LLM    |
| `QDRANT_HOST`          | No       | `localhost:6334`         | Qdrant gRPC endpoint                      |
| `QDRANT_API_KEY`       | No       | —                        | Qdrant authentication                     |
| `APP_BASE_URL`         | No       | `http://localhost:8080`  | Public base URL (used in OAuth redirects) |
| `EMBEDDING_PROVIDER`   | No       | `openai`                 | Embedding backend                         |
| `EMBEDDING_MODEL`      | No       | `text-embedding-3-small` | OpenAI embedding model                    |
| `PORT`                 | No       | `8080`                   | HTTP listen port                          |

\*At least one OAuth provider is required.

## Project Layout

```
main.go                  # entrypoint
internal/
  api/
    handlers/            # auth, oauth, memory, models
    middleware/          # bearer token + MCP token validation
    routes/              # router setup
  engine/                # conversation → memory pipeline
    engine.go            # orchestrates extract → classify → dedup → score → store
    extractor.go
    classifier.go
    deduplicator.go
    scorer.go
  embedding/             # Embedder interface + OpenAI implementation
  memory/                # MemoryService + PostgreSQL/Qdrant repository
  mcp/                   # MCP server (fetch_memories, submit_conversation tools)
  store/                 # DB (GORM) and Qdrant gRPC client
  user/                  # user service, token management, connected models
pkg/
  models/                # shared domain types (User, Memory, ConnectedModel)
  config/                # env var loading
```

## API Overview

### Public

```
GET  /v1/health
GET  /v1/auth/{provider}           # start OAuth flow
GET  /v1/auth/{provider}/callback  # OAuth callback
GET  /.well-known/oauth-authorization-server
GET  /.well-known/oauth-protected-resource
POST /oauth/register               # RFC 7591 dynamic client registration
GET  /oauth/authorize
POST /oauth/token                  # PKCE S256 exchange
```

### Authenticated (Bearer token)

```
POST /v1/mcp/token
POST /v1/models/connect
GET  /v1/models
GET  /v1/memory
GET  /v1/memory/{id}
POST /v1/memory/submit
GET  /v1/memory/fetch
POST /mcp                          # MCP server
```

## Development Workflow

### Running tests

```bash
go test ./...
```

### Building

```bash
go build -o havril .
```

### Deploying

```bash
make build   # cross-compile for Linux amd64
make copy    # scp binary to production server
```

## Core Rules

**Scope every query by userID.** No user should ever be able to read, write, or delete another user's data. This applies to both PostgreSQL queries and Qdrant searches.

**No stored transcripts.** The engine processes conversation text in memory and discards it. Raw conversation content must never be written to the database.

**Keep PostgreSQL and Qdrant in sync.** Any write (create, delete, deactivate) must update both stores. Do not let them diverge.

**Fail loudly on embedding errors.** If an embedding call fails, return an error. Do not silently store a memory without its vector — it will be permanently unsearchable.

**Consistent error format.** All error responses must follow `{ "error": string, "code": string }` with the correct HTTP status.

## Pull Requests

- One logical change per PR.
- Include a short description of what changed and why.
- All tests must pass before requesting review.
- Do not break `/v1/health` — CI depends on it.

## Reporting Issues

Open a GitHub issue with: Go version, OS, steps to reproduce, expected behavior, actual behavior.
