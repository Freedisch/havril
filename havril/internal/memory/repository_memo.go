package memory

import (
	"context"
	"errors"

	"github.com/freedisch/havril/internal/embedding"
	"github.com/freedisch/havril/internal/store/vector"
	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrNotFound = errors.New("Memory not found")

type Repository struct {
	db         *gorm.DB
	vectors    vector.Store
	embeddings embedding.Embedder
}

func NewRepository(db *gorm.DB, vectors vector.Store, embeddings embedding.Embedder) *Repository {
	return &Repository{db: db, vectors: vectors, embeddings: embeddings}
}

func (r *Repository) Create(ctx context.Context, m *models.Memory) error {
	m.ID = uuid.New()
	m.EmbeddingStatus = models.EmbeddingStatusPending

	err := r.db.WithContext(ctx).Create(m).Error
	if err != nil {
		return err
	}

	val, err := r.embeddings.Embed(ctx, m.Content)
	if err != nil {
		return err
	}

	err = r.vectors.Upsert(ctx, m.ID, m.UserID, val, m.Type)
	if err != nil {
		return err
	}

	r.db.WithContext(ctx).
		Model(&models.Memory{}).
		Where("id = ?", m.ID).
		Update("embedding_status", models.EmbeddingStatusSynced)

	m.EmbeddingStatus = models.EmbeddingStatusSynced
	return nil

}

func (r *Repository) SearchSimilar(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*models.Memory, error) {
	vec, err := r.embeddings.Embed(ctx, query)
	if err != nil {
		return nil, err
	}

	hits, err := r.vectors.Search(ctx, userID, vec, limit)
	if err != nil {
		return nil, err
	}

	if len(hits) == 0 {
		return nil, nil
	}

	ids := make([]uuid.UUID, len(hits))
	for i, h := range hits {
		ids[i] = h.ID
	}

	var ms []*models.Memory
	if err := r.db.WithContext(ctx).Where("id IN ? AND user_id = ? AND is_active = true", ids, userID).Find(&ms).Error; err != nil {
		return nil, err
	}

	index := make(map[uuid.UUID]*models.Memory, len(ms))
	for _, h := range ms {
		index[h.ID] = h
	}

	ordered := make([]*models.Memory, 0, len(hits))
	for _, h := range hits {
		if m, ok := index[h.ID]; ok {
			ordered = append(ordered, m)
		}
	}
	return ordered, nil

}

func (r *Repository) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Memory, error) {
	var m models.Memory
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&m).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &m, err
}

func (r *Repository) List(ctx context.Context, userID uuid.UUID, activeOnly bool) ([]*models.Memory, error) {
	q := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if activeOnly {
		q = q.Where("is_active = true")
	}

	var ms []*models.Memory
	err := q.Order("Importance DESC, created_at DESC").Find(&ms).Error
	return ms, err
}
