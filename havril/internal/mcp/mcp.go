package mcp

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/freedisch/havril/internal/memory"
	"github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// sessionIDManager generates proper session IDs for clients but accepts any value
// (including empty) during validation, so both MCP-spec-compliant clients and
// direct API callers work without a 404.
type sessionIDManager struct{}

func (m *sessionIDManager) Generate() string {
	return "mcp-session-" + uuid.New().String()
}

func (m *sessionIDManager) Validate(_ string) (bool, error) { return false, nil }
func (m *sessionIDManager) Terminate(_ string) (bool, error) { return false, nil }

type Server struct {
	mcp        *server.MCPServer
	streamable *server.StreamableHTTPServer
	memorySvc  memory.Service
	userRepo   *user.Repository
	sessions   sync.Map // sessionID → uuid.UUID: cache Bearer-auth across a session
}

func New(memorySvc memory.Service, userRepo *user.Repository) *Server {
	s := &Server{
		memorySvc: memorySvc,
		userRepo:  userRepo,
	}

	s.mcp = server.NewMCPServer(
		"havril",
		"1.0.0",
		server.WithToolCapabilities(true),
	)

	s.registerFetchMemories()
	s.registerSubmitConversation()

	s.streamable = server.NewStreamableHTTPServer(s.mcp,
		server.WithHTTPContextFunc(s.authenticate),
		server.WithSessionIdManager(&sessionIDManager{}),
	)

	return s
}

func (s *Server) Handler() http.Handler {
	return s.streamable
}

// MustAuth is an HTTP middleware that enforces authentication before any request
// reaches the MCP library. It checks the session cache first (so tool calls work
// even when the client omits the Authorization header after initialize), then
// falls back to validating the Bearer token. Unauthenticated requests receive
// HTTP 401, which causes MCP clients to trigger the OAuth flow and redirect the
// user to /oauth/authorize to log in.
func (s *Server) MustAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var userID uuid.UUID

		// Re-use session authenticated during initialize.
		if sid := r.Header.Get("Mcp-Session-Id"); sid != "" {
			if uid, ok := s.sessions.Load(sid); ok {
				userID = uid.(uuid.UUID)
			}
		}

		// Fall back to Bearer token.
		if userID == (uuid.UUID{}) {
			token, err := extractBearerToken(r)
			if err != nil {
				writeUnauthorized(w)
				return
			}
			sum := sha256.Sum256([]byte(token))
			tokenHash := hex.EncodeToString(sum[:])
			u, err := s.userRepo.GetByTokenHash(r.Context(), tokenHash)
			if err != nil {
				writeUnauthorized(w)
				return
			}
			uid, err := uuid.Parse(u.ID)
			if err != nil {
				writeUnauthorized(w)
				return
			}
			userID = uid
			// Cache so subsequent requests in this session skip token validation.
			if sid := r.Header.Get("Mcp-Session-Id"); sid != "" {
				s.sessions.Store(sid, userID)
			}
		}

		next.ServeHTTP(w, r.WithContext(user.WithUserID(r.Context(), userID)))
	})
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Bearer realm="havril",error="invalid_token",error_description="A valid Bearer token is required"`)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"error":"unauthorized","code":"bearer_token_required"}`)) //nolint:errcheck
}

func (s *Server) registerFetchMemories(){
	tool := mcp.NewTool("fetch_memories", mcp.WithDescription(
			"Retrieve memories relevant to the current conversation context. "+
				"Call this at the start of every new conversation to personalise your response.",
		),
		mcp.WithString("query",
			mcp.Required(),
			mcp.Description("The current user message or topic to search against"),
		),
		mcp.WithNumber("limit",
			mcp.Description("Maximum number of memories to return (default 5, max 20)"),
		),
)
s.mcp.AddTool(tool, s.handleFetchMemories)
}

func (s *Server) handleFetchMemories(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID := user.UserIDFromContext(ctx)
	if userID == (uuid.UUID{}) {
		return mcp.NewToolResultError("unauthorized: valid Bearer token required" + userID.String()), nil
	}
	query, err := req.RequireString("query")
	if err != nil || query == "" {
		return mcp.NewToolResultError("query is required"), nil
	}

	limit := req.GetInt("limit", 5)

	memories, err := s.memorySvc.Fetch(ctx, userID, query, limit)
	if err != nil {
		return mcp.NewToolResultError("failed to fetch memories: " + err.Error()), nil
	}

	type memItem struct {
		Content    string  `json:"content"`
		Type       string  `json:"type"`
		Importance float64 `json:"importance"`
	}

	items := make([]memItem, 0, len(memories))
	for _, m := range memories{
		items = append(items, memItem{
			Content: m.Content,
			Type: m.Type,
			Importance: m.Importance,
		})
	}

	data, err := json.Marshal(map[string]any{"memories": items})
	if err != nil{
		return mcp.NewToolResultError("failed to encode memories"), nil
	}
	return mcp.NewToolResultText(string(data)), nil

}


func extractBearerToken(r *http.Request) (string, error){
	header := r.Header.Get("Authorization")
	if header == ""{
		return "", fmt.Errorf("missing Authorization header")
	}
	const prefix = "Bearer "
	if len(header) <= len(prefix){
		return "", fmt.Errorf("malformed Authorization header")
	}
	return header[len(prefix):], nil
}

func (s *Server) handleSubmitConversation(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID := user.UserIDFromContext(ctx)
	if userID == (uuid.UUID{}) {
		return mcp.NewToolResultError("unauthorized: valid Bearer token required"), nil
	}

	args := req.GetArguments()
	rawConv, ok := args["conversation"]
	if !ok {
		return mcp.NewToolResultError("conversation is required"), nil
	}

	sourceModel, err := req.RequireString("source_model")
	if err != nil || sourceModel == "" {
		return mcp.NewToolResultError("source_model is required"), nil
	}

	convBytes, err := json.Marshal(rawConv)
	if err != nil{
		return mcp.NewToolResultError("invalid conversation format"), nil
	}
	var conversation []models.Message
	if err := json.Unmarshal(convBytes, &conversation); err != nil{
		return mcp.NewToolResultError("conversation must be an array of {role, content} objects"), nil
	}

	if len(conversation) == 0{
		return mcp.NewToolResultError("conversation must not be empty"), nil
	}

	result, err := s.memorySvc.Submit(ctx, userID, conversation, sourceModel)
	if err != nil {
		return mcp.NewToolResultError("failed to process conversation: " + err.Error()), nil
	}

	data, err := json.Marshal(result)
	if err != nil{
		return mcp.NewToolResultError("failed to encode result"), nil
	}

	return mcp.NewToolResultText(string(data)), nil
}

func (s *Server) registerSubmitConversation(){
	tool := mcp.NewTool("submit_conversation",
		mcp.WithDescription(
			"Submit this conversation to MemoAI for processing and memory storage. "+
				"Call this when the conversation ends or when the user says goodbye.",
		),
		mcp.WithArray("conversation",
			mcp.Required(),
			mcp.Description("The full conversation as an array of {role, content} objects"),
		),
		mcp.WithString("source_model",
			mcp.Required(),
			mcp.Description("The model identifier submitting this conversation, e.g. claude-sonnet-4-5"),
		),
	)
 
	s.mcp.AddTool(tool, s.handleSubmitConversation)
}

// authenticate implements server.HTTPContextFunc. It first tries to reuse a
// previously-authenticated session (keyed by Mcp-Session-Id), then falls back
// to validating the Bearer token directly. On success the userID is injected
// into the context and, if a session ID is present, cached for future requests.
func (s *Server) authenticate(ctx context.Context, r *http.Request) context.Context {
	// MustAuth middleware already validated and injected the userID.
	if uid := user.UserIDFromContext(ctx); uid != (uuid.UUID{}) {
		return ctx
	}

	// Fallback: session cache (in case the middleware was bypassed).
	if session := server.ClientSessionFromContext(ctx); session != nil {
		if sid := session.SessionID(); sid != "" {
			if uid, ok := s.sessions.Load(sid); ok {
				return user.WithUserID(ctx, uid.(uuid.UUID))
			}
		}
	}

	token, err := extractBearerToken(r)
	if err != nil {
		log.Printf("authenticate: extract token: %v", err)
		return ctx
	}
	sum := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(sum[:])

	u, err := s.userRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		log.Printf("authenticate: get user by token hash: %v", err)
		return ctx
	}
	userID, err := uuid.Parse(u.ID)
	if err != nil {
		log.Printf("authenticate: parse user ID %q: %v", u.ID, err)
		return ctx
	}

	if session := server.ClientSessionFromContext(ctx); session != nil {
		if sid := session.SessionID(); sid != "" {
			s.sessions.Store(sid, userID)
		}
	}

	log.Printf("authenticate: user %s authenticated", userID)
	return user.WithUserID(ctx, userID)
}

