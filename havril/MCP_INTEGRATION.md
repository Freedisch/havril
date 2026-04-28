# Havril MCP Integration — Debug & Implementation Log

## Overview

This document covers the full journey of wiring Havril's MCP server to Claude.ai,
all the bugs encountered, fixes applied, and how the final auth flow works.

---

## 1. Wrong Transport Protocol

### Problem
The original code used `SSEServer` — the **legacy MCP transport** (2024 spec):
- Client GETs `/mcp/sse` → server streams an event with the message endpoint URL
- Client POSTs JSON-RPC to `/mcp/message?sessionId=xxx`

Claude.ai has migrated to the **Streamable HTTP transport** (MCP spec 2025-03-26):
- Client POSTs JSON-RPC directly to a single `/mcp` endpoint

This caused `POST /mcp/sse → 405 Method Not Allowed` in the logs.

### Fix
Replaced `SSEServer` with `StreamableHTTPServer` from `mcp-go v0.49.0` and
consolidated to a single `/mcp` route.

```go
// internal/mcp/mcp.go
s.streamable = server.NewStreamableHTTPServer(s.mcp,
    server.WithHTTPContextFunc(s.authenticate),
    server.WithStateLess(true),
)
```

```go
// main.go
mcpHandler := mcpSrv.Handler()
r.Method(http.MethodPost, "/mcp", mcpHandler)
r.Method(http.MethodGet, "/mcp", mcpHandler)
r.Method(http.MethodDelete, "/mcp", mcpHandler)
```

**URL to enter in Claude.ai:** `https://your-tunnel.domain/mcp` (not `/mcp/sse`)

---

## 2. Hardcoded Wrong baseURL

### Problem
The old SSEServer had `baseURL` hardcoded to `"https://ngrok-free.app/mcp"` — the
bare root domain, not an actual tunnel. The SSE endpoint event was returning
`localhost:8080` as the message address, which Claude.ai (cloud) couldn't reach.

### Fix
`StreamableHTTPServer` doesn't need a `baseURL` at all — there's only one endpoint
and the client already knows where it is.

---

## 3. Chi's `r.Mount` Strips Path Prefixes

### Problem
`r.Mount("/mcp", handler)` causes chi to strip `/mcp` from the URL before the
SSEServer's `ServeHTTP` sees it. SSEServer's internal routing matched against
`/mcp/sse` but received `/sse` — causing 404s.

### Fix
Used explicit `r.Method(METHOD, "/mcp", handler)` registrations instead of
`r.Mount`. These route directly to the handler without any prefix stripping.

---

## 4. Missing OAuth Discovery Endpoint

### Problem
Claude.ai's MCP client walks an OAuth discovery chain before connecting:
1. `GET /.well-known/oauth-protected-resource` → find the auth server
2. `GET /.well-known/oauth-authorization-server` → get OAuth endpoints
3. `POST /oauth/register` → register as a dynamic client
4. `GET /oauth/authorize` → attempt auth
5. On failure → fall back to asking for a Bearer token

Step 1 was returning 404, breaking the chain before it started.

### Fix
Added `ProtectedResource` handler (RFC 9728):

```go
func (h *OAuthHandler) ProtectedResource(w http.ResponseWriter, r *http.Request) {
    base := requestBaseURL(r)
    json.NewEncoder(w).Encode(map[string]any{
        "resource":              base,
        "authorization_servers": []string{base},
    })
}
```

Registered at both `/.well-known/oauth-protected-resource` and
`/.well-known/oauth-protected-resource/*`.

---

## 5. Panic on Unauthenticated MCP Requests

### Problem
`UserIDFromContext` panicked when no userID was in the context:

```go
panic: userID not found in context — auth middleware missing
```

The `authenticate` HTTPContextFunc failed silently when no Bearer token was
present, and the tool handlers then called `UserIDFromContext` on an empty context.

### Fix (two parts)

**Part 1** — `UserIDFromContext` returns zero UUID instead of panicking:
```go
func UserIDFromContext(ctx context.Context) uuid.UUID {
    id, _ := ctx.Value(userIDKey).(uuid.UUID)
    return id
}
```

**Part 2** — Tool handlers guard against zero UUID:
```go
userID := user.UserIDFromContext(ctx)
if userID == (uuid.UUID{}) {
    return mcp.NewToolResultError("unauthorized: valid Bearer token required"), nil
}
```

Tracked in GitHub issue [#27](https://github.com/Freedisch/havril/issues/27).

---

## 6. Full OAuth Flow Implementation

### Problem
Claude.ai was connecting to `/mcp` without any auth because:
- The old `access_denied` trick no longer triggers a Bearer token prompt in
  current Claude.ai
- No real OAuth flow was implemented
- Tools ran with zero userID, returning empty results silently

### Fix
Implemented a real OAuth 2.0 + PKCE flow.

#### Flow
```
1. GET  /.well-known/oauth-protected-resource   → auth server discovery
2. GET  /.well-known/oauth-authorization-server → OAuth endpoint discovery
3. POST /oauth/register                         → dynamic client registration
4. GET  /oauth/authorize                        → show login form (or auto-approve)
5. POST /oauth/authorize                        → validate token, issue auth code
6. POST /oauth/token                            → exchange code for access token
```

#### Key endpoints

**`GET /oauth/authorize`** — shows an HTML form asking for the user's Bearer token,
OR auto-approves silently if a `havril_session` cookie is present.

**`POST /oauth/authorize`** — validates the pasted token, generates a short-lived
auth code (10 min expiry), redirects to `redirect_uri?code=xxx`.

**`POST /oauth/token`** — verifies PKCE (S256), exchanges the code for the raw
Bearer token, returns it as `access_token`.

After this flow, Claude.ai stores the token and sends
`Authorization: Bearer havril_xxx` with every `/mcp` request automatically.

---

## 7. Seamless Auth via Session Cookie

### Problem
Requiring users to manually find and paste their Bearer token into an OAuth form
is poor UX. The browser extension is already authenticated — it should handle
the authorization automatically.

### How it works

**Step 1 — Cookie is set at extension login time** (`auth_handler.go`):

When the user logs in via the extension (Google/GitHub OAuth), the server now
sets a long-lived `havril_session` cookie in the browser alongside the existing
extension redirect:

```go
http.SetCookie(w, &http.Cookie{
    Name:     "havril_session",
    Value:    rawToken,
    Path:     "/",
    MaxAge:   365 * 24 * 60 * 60, // 1 year
    HttpOnly: true,
    SameSite: http.SameSiteLaxMode,
})
```

**Step 2 — Auto-authorize when cookie is present** (`oauth_handler.go`):

When Claude.ai opens `/oauth/authorize` in the browser, the browser sends the
`havril_session` cookie automatically. The handler validates it, issues an auth
code, and redirects back to Claude.ai — with no user interaction:

```go
func (h *OAuthHandler) Authorize(w http.ResponseWriter, r *http.Request) {
    if cookie, err := r.Cookie("havril_session"); err == nil {
        h.autoAuthorize(w, r, cookie.Value) // silent, instant redirect
        return
    }
    h.authorizeForm(w, r) // fallback: show the token form
}
```

**End-to-end experience:**
1. User logs in via extension once → `havril_session` cookie set in browser
2. User adds `https://your-tunnel/mcp` to Claude.ai MCP settings
3. Claude.ai opens the authorize URL → browser sends cookie → instant redirect
4. Claude.ai stores the token, MCP tools work with real user data from then on

**Fallback:** If the session cookie is missing or stale, the form is shown so
the user can paste their token manually.

---

## 8. Dynamic OAuth Metadata URLs

### Problem
OAuth metadata (`/.well-known/oauth-authorization-server`) was using the static
`baseURL` env var. Behind tunnels (Cloudflare, ngrok) the public hostname changes,
causing mismatches.

### Fix
Infer the public base URL from request headers at runtime:

```go
func requestBaseURL(r *http.Request) string {
    scheme := "http"
    if p := r.Header.Get("X-Forwarded-Proto"); p != "" {
        scheme = p
    }
    host := r.Host
    if h := r.Header.Get("X-Forwarded-Host"); h != "" {
        host = h
    }
    return scheme + "://" + host
}
```

Cloudflare Tunnel sets `X-Forwarded-Proto: https` and passes the correct
`Host` header, so metadata always reflects the real public URL.

---

## Architecture Summary

```
Claude.ai
  │
  ├── OAuth discovery (one-time setup)
  │     ├── GET /.well-known/oauth-protected-resource
  │     ├── GET /.well-known/oauth-authorization-server
  │     ├── POST /oauth/register
  │     ├── GET /oauth/authorize  ──→ auto-approved via havril_session cookie
  │     └── POST /oauth/token     ──→ returns Bearer token
  │
  └── Every conversation
        └── POST /mcp
              Authorization: Bearer havril_xxx
              └── authenticate() → SHA-256 lookup → inject userID
              └── fetch_memories / submit_conversation tools run
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `APP_BASE_URL` | Public base URL (fallback if no proxy headers) |
| `DATABASE_URL` | PostgreSQL DSN |
| `QDRANT_HOST` | Qdrant gRPC host |
| `OPENAI_API_KEY` | Embeddings + engine LLM |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth provider |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth provider |
| `SESSION_SECRET` | Cookie store signing key |

---

## 9. Tool Calls Arriving With No Authorization Header

### Problem

Even after the OAuth flow completed and Claude.ai had a valid Bearer token,
`fetch_memories` and `submit_conversation` were failing with:

```
unauthorized: valid Bearer token required
```

Server logs showed `authenticate: extract token: missing Authorization header`
on every tool call.

**Root cause — how the MCP Streamable HTTP protocol works:**

Claude.ai only sends `Authorization: Bearer <token>` on the **first** request
(`initialize`). For every subsequent tool call it sends only the session ID:

```
Mcp-Session-Id: mcp-session-<uuid>
```

No `Authorization` header. This is correct per the MCP spec — the session is
supposed to carry the identity. But the server was re-validating the Bearer
token on every request and had no session memory, so every tool call failed.

A second contributing issue: the server was using `WithStateLess(true)`, which
made `sessionIDManager.Generate()` return `""`. Session IDs were all empty
strings, so there was nothing to key a session cache on.

### Fix — three coordinated changes

#### 1. Custom `sessionIDManager` (replaces `WithStateLess(true)`)

```go
type sessionIDManager struct{}

func (m *sessionIDManager) Generate() string {
    return "mcp-session-" + uuid.New().String()
}
func (m *sessionIDManager) Validate(_ string) (bool, error) { return false, nil }
func (m *sessionIDManager) Terminate(_ string) (bool, error) { return false, nil }
```

`Generate()` returns real UUIDs → Claude.ai gets a session ID from `initialize`
and sends it back on tool calls.  
`Validate()` always returns `(false, nil)` → direct API callers without a session
ID still work (no spurious 404s).

#### 2. Session cache on `Server`

```go
type Server struct {
    ...
    sessions sync.Map // sessionID → uuid.UUID
}
```

#### 3. `MustAuth` HTTP middleware (closes issue #27)

Sits in front of the MCP library. Checks the session cache first; falls back to
Bearer token validation; returns **HTTP 401** (not a JSON-RPC error) on failure
so Claude.ai triggers the OAuth re-login flow.

```go
func (s *Server) MustAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        var userID uuid.UUID

        // Re-use session from initialize
        if sid := r.Header.Get("Mcp-Session-Id"); sid != "" {
            if uid, ok := s.sessions.Load(sid); ok {
                userID = uid.(uuid.UUID)
            }
        }

        // Fall back to Bearer token
        if userID == (uuid.UUID{}) {
            token, err := extractBearerToken(r)
            if err != nil { writeUnauthorized(w); return }
            // ... validate token, store in cache ...
        }

        next.ServeHTTP(w, r.WithContext(user.WithUserID(r.Context(), userID)))
    })
}
```

On the first authenticated request (`initialize` with Bearer token):
1. `MustAuth` validates the token and stores `sessionID → userID`
2. `authenticate` (via `WithHTTPContextFunc`) short-circuits because userID is
   already in `r.Context()`

On all subsequent tool calls (session ID only, no Bearer token):
1. `MustAuth` looks up `sessionID → userID` from cache
2. Injects userID, calls `next`
3. Tool handler calls `user.UserIDFromContext(ctx)` — gets real userID

Wired in `main.go`:
```go
mcpHandler := mcpSrv.MustAuth(mcpSrv.Handler())
```

---

## 10. OAuth Metadata Returning localhost URLs

### Problem

After fixing the token flow, the OAuth discovery phase was still silently
failing. The `/.well-known/oauth-authorization-server` response contained:

```json
{ "authorization_endpoint": "http://localhost:8080/oauth/authorize" }
```

Claude.ai's backend servers (in the cloud) can't reach `localhost:8080`. The
token exchange (`POST /oauth/token`) went nowhere. The OAuth flow appeared to
complete but the token was never stored.

This was diagnosed from the server logs: the full discovery sequence appeared
correctly, but no `POST /oauth/register` or `GET /oauth/authorize` followed —
Claude.ai gave up silently because the authorization URL was unreachable.

### Fix

`Metadata()` and `ProtectedResource()` already had `requestBaseURL(r)` added
in session 8, but that fix wasn't live when this issue appeared. Confirming the
fix is correct and now active:

```go
func requestBaseURL(r *http.Request) string {
    scheme := "http"
    if r.TLS != nil { scheme = "https" }
    if p := r.Header.Get("X-Forwarded-Proto"); p != "" { scheme = p }
    host := r.Host
    if h := r.Header.Get("X-Forwarded-Host"); h != "" { host = h }
    return scheme + "://" + host
}
```

Cloudflare Tunnel sets `X-Forwarded-Proto: https` and passes the original
`Host` header, so the metadata now returns the correct public tunnel URL
regardless of what `APP_BASE_URL` is set to.

---

## Architecture Summary (current)

```
Claude.ai
  │
  ├── OAuth discovery (one-time setup per device/browser)
  │     ├── POST /mcp                              → 401 (triggers discovery)
  │     ├── GET  /.well-known/oauth-protected-resource
  │     ├── GET  /.well-known/oauth-authorization-server
  │     ├── POST /oauth/register
  │     ├── GET  /oauth/authorize  ──────────────→ auto-approved via havril_session cookie
  │     │                                           (or manual token form as fallback)
  │     └── POST /oauth/token      ──────────────→ returns Bearer token to Claude.ai
  │
  └── Every conversation
        ├── POST /mcp  (initialize, with Authorization: Bearer <token>)
        │     └── MustAuth: validates token → stores sessionID → userID in cache
        │
        └── POST /mcp  (tool calls: fetch_memories, submit_conversation)
              Mcp-Session-Id: mcp-session-<uuid>   ← no Bearer token
              └── MustAuth: cache hit → injects userID
              └── tool handler runs with real user data
```

---

## Open Issues

- Issue #27 **closed** — `MustAuth` middleware now enforces HTTP-level auth
  on all `/mcp` routes. Unauthenticated requests receive `HTTP 401` with a
  `WWW-Authenticate: Bearer` header, which triggers Claude.ai's OAuth re-login
  flow rather than silently returning a JSON-RPC error.

---

## VS Code Git Notes

- VS Code's Git extension polls git every few seconds for branch status and file
  diff decorations — the `git for-each-ref`, `git status`, `git cat-file`,
  `git show` commands in the output log are all normal IDE housekeeping.
- The repeated `.git/hooks/commit-msg: entire: command not found` means the
  Entire CLI hook is installed but VS Code can't find the binary because it
  doesn't inherit the shell `PATH`. Fix: use the full path in the hook
  (e.g. `/opt/homebrew/bin/entire`) or add the bin directory to VS Code's
  `terminal.integrated.env.osx` setting.
