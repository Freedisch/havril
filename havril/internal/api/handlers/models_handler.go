package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/freedisch/havril/internal/api/middleware"
	"github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/models"
)

type ModelsHandler struct {
	service *user.ModelService
}

func NewModelsHandler(service *user.ModelService) *ModelsHandler {
	return &ModelsHandler{service: service}
}

func (h *ModelsHandler) Connect(w http.ResponseWriter, r *http.Request) {
	currentUser := r.Context().Value(middleware.ContextKeyUser).(*models.User)

	var body struct {
		Provider    string `json:"provider"`
		Integration string `json:"integration"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, "invalid request body", "invalid_request", http.StatusBadRequest)
		return
	}
	if body.Provider == "" || body.Integration == "" {
		writeError(w, "provider and integration are required", "invalid_request", http.StatusBadRequest)
		return
	}

	cm, err := h.service.Connect(r.Context(), currentUser.ID, body.Provider, body.Integration)
	if err != nil {
		writeError(w, err.Error(), "invalid_request", http.StatusBadRequest)
		return
	}

	writeJSON(w, cm, http.StatusCreated)
}

func (h *ModelsHandler) List(w http.ResponseWriter, r *http.Request) {
	currentUser := r.Context().Value(middleware.ContextKeyUser).(*models.User)

	cms, err := h.service.List(r.Context(), currentUser.ID)
	if err != nil {
		writeError(w, "failed to list models", "internal_error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, cms, http.StatusOK)
}
