package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/freedisch/havril/internal/memory"
	"github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MemoryHandler struct {
	service memory.Service
}

func NewMemoryHandler(service memory.Service) *MemoryHandler{
	return &MemoryHandler{service: service}
}

func(h *MemoryHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := user.UserIDFromContext(r.Context())

	memories, err := h.service.List(r.Context(), userID)
	if err != nil {
		http.Error(w,"internal_error failed to list memories", http.StatusInternalServerError)
		return
	}
 
	if memories == nil {
		memories = []*models.Memory{}
	}
 
	writeJSON(w, map[string]any{
		"memories": memories,
		"count":    len(memories),
	}, http.StatusOK,)

}

func(h *MemoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := user.UserIDFromContext(r.Context())
	id, err := parseUUID(w, r, "id")
	if err != nil {
		return
	}
 
	m, err := h.service.GetByID(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, memory.ErrNotFound) {
		 	writeError(w, "not_found",  "memory not found", http.StatusNotFound)
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