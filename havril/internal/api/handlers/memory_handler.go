package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/freedisch/havril/internal/memory"
	"github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MemoryHandler struct {
	service memory.Service
}

func NewMemoryHandler(service memory.Service) *MemoryHandler {
	return &MemoryHandler{service: service}
}

func (h *MemoryHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := user.UserIDFromContext(r.Context())

	memories, err := h.service.List(r.Context(), userID)
	if err != nil {
		http.Error(w, "internal_error failed to list memories", http.StatusInternalServerError)
		return
	}

	if memories == nil {
		memories = []*models.Memory{}
	}

	writeJSON(w, map[string]any{
		"memories": memories,
		"count":    len(memories),
	}, http.StatusOK)

}

func (h *MemoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := user.UserIDFromContext(r.Context())
	id, err := parseUUID(w, r, "id")
	if err != nil {
		return
	}

	m, err := h.service.GetByID(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, memory.ErrNotFound) {
			writeError(w, "not_found", "memory not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal_error failed to get memory", http.StatusInternalServerError)
		return
	}

	writeJSON(w, m, http.StatusOK)

}

func parseUUID(w http.ResponseWriter, r *http.Request, param string) (uuid.UUID, error) {
	raw := chi.URLParam(r, param)
	id, err := uuid.Parse(raw)
	if err != nil {
		http.Error(w, fmt.Sprintf("invalid_request invalid %s — must be a UUID", param), http.StatusBadRequest)
		return uuid.Nil, err
	}
	return id, nil
}


func (h *MemoryHandler) Submit(w http.ResponseWriter, r *http.Request) {
	userID := user.UserIDFromContext(r.Context())
 
	var body struct {
		Conversation []models.Message `json:"conversation"`
		SourceModel  string           `json:"source_model"`
	}
 
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, "invalid_request", "malformed JSON body", http.StatusBadRequest)
		return
	}
	if len(body.Conversation) == 0 {
		writeError(w, "invalid_request", "conversation is required and must not be empty", http.StatusBadRequest)
		return
	}
	if body.SourceModel == "" {
		writeError(w, "invalid_request", "source_model is required", http.StatusBadRequest)
		return
	}
 
	// Validate each message has a role and content
	for i, msg := range body.Conversation {
		if msg.Role != "user" && msg.Role != "assistant" {
			writeError(w, "invalid_request",
				"conversation["+strconv.Itoa(i)+"]: role must be 'user' or 'assistant'", http.StatusBadRequest)
			return
		}
		if msg.Content == "" {
			writeError(w, "invalid_request",
				"conversation["+strconv.Itoa(i)+"]: content must not be empty", http.StatusBadRequest)
			return
		}
	}
 
	result, err := h.service.Submit(r.Context(), userID, body.Conversation, body.SourceModel)
	if err != nil {
		writeError(w, "engine_error", "failed to process conversation", http.StatusUnprocessableEntity)
		return
	}
 
	writeJSON(w, result, http.StatusOK)
}

func (h *MemoryHandler) Fetch(w http.ResponseWriter, r *http.Request) {
	userID := user.UserIDFromContext(r.Context())
 
	query := r.URL.Query().Get("q")
	if query == "" {
		writeError(w,"invalid_request", "query parameter 'q' is required",  http.StatusBadRequest)
		return
	}
 
	limit := 5
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			writeError(w, "invalid_request", "limit must be a positive integer", http.StatusBadRequest)
			return
		}
		limit = parsed
	}
 
	memories, err := h.service.Fetch(r.Context(), userID, query, limit)
	if err != nil {
		writeError(w, "internal_error", "failed to fetch memories", http.StatusInternalServerError)
		return
	}
 
	// Build response — strip the internal Score field from public responses
	type memoryResponse struct {
		ID          uuid.UUID  `json:"id"`
		Content     string     `json:"content"`
		Type        string     `json:"type"`
		Importance  float64    `json:"importance"`
		Tags        []string   `json:"tags"`
		CreatedAt   string     `json:"created_at"`
	}
 
	items := make([]memoryResponse, 0, len(memories))
	for _, m := range memories {
		items = append(items, memoryResponse{
			ID:         m.ID,
			Content:    m.Content,
			Type:       m.Type,
			Importance: m.Importance,
			Tags:       m.Tags,
			CreatedAt:  m.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
 
	writeJSON(w, map[string]any{"memories": items}, http.StatusOK)
}