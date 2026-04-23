package mcp

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/freedisch/havril/internal/memory"
	"github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)
type Server struct {
	mcp        *server.MCPServer
	streamable *server.StreamableHTTPServer
	memorySvc  memory.Service
	userRepo   *user.Repository
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
		server.WithStateLess(true),
	)

	return s
}

func (s *Server) Handler() http.Handler {
	return s.streamable
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

func (s *Server) handleFetchMemories(ctx context.Context, req mcp.CallToolRequest)(*mcp.CallToolResult, error){
	userID := user.UserIDFromContext(ctx)
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

func (s *Server) handleSubmitConversation(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error){
	userID := user.UserIDFromContext(ctx)

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

// authenticate implements server.HTTPContextFunc. It validates the Bearer token
// and injects the userID into the context; on failure the original ctx is returned
// unchanged and UserIDFromContext will return a zero value in the handler.
func (s *Server) authenticate(ctx context.Context, r *http.Request) context.Context {
	token, err := extractBearerToken(r)
	if err != nil {
		return ctx
	}

	sum := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(sum[:])

	u, err := s.userRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return ctx
	}

	userID, err := uuid.Parse(u.ID)
	if err != nil {
		return ctx
	}

	return user.WithUserID(ctx, userID)
}

