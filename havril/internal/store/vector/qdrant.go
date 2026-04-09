package vector

import (
	"context"
	"fmt"
	"net"

	"github.com/google/uuid"
	"github.com/qdrant/go-client/qdrant"
)

const collectionName = "memories"

type SearchResult struct {
	ID    uuid.UUID
	Score float32
}

// Store is the interface the memory repository depends on.
// The concrete implementation uses Qdrant gRPC; tests inject a fake.
type Store interface {
	Upsert(ctx context.Context, id uuid.UUID, userID uuid.UUID, vector []float32, memType string) error
	Search(ctx context.Context, userID uuid.UUID, vector []float32, limit int) ([]SearchResult, error)
	Delete(ctx context.Context, userID uuid.UUID) error
	SetInative(ctx context.Context, id uuid.UUID) error
}

// QdrantStore is the production Store backed by Qdrant gRPC.
type QdrantStore struct {
	client *qdrant.Client
}

// New connects to Qdrant and returns a ready Store.
// hostport may be "host:port" or just "host" (port defaults to 6334).
// If apiKey is non-empty, TLS is enabled automatically (required for Qdrant Cloud).
func New(hostport, apiKey string) (*QdrantStore, error) {
	host, port := splitHostPort(hostport)
	client, err := qdrant.NewClient(&qdrant.Config{
		Host:   host,
		Port:   port,
		APIKey: apiKey,
		UseTLS: apiKey != "",
	})
	if err != nil {
		return nil, fmt.Errorf("qdrant: connect to %s:%d: %w", host, port, err)
	}
	return &QdrantStore{client: client}, nil
}

func (s *QdrantStore) Close() error {
	return s.client.Close()
}

// EnsureCollection creates the "memories" collection if it does not exist.
func EnsureCollection(ctx context.Context, hostport, apiKey string) error {
	host, port := splitHostPort(hostport)
	client, err := qdrant.NewClient(&qdrant.Config{
		Host:   host,
		Port:   port,
		APIKey: apiKey,
		UseTLS: apiKey != "",
	})
	if err != nil {
		return fmt.Errorf("qdrant: connect for setup: %w", err)
	}
	defer client.Close()

	exists, err := client.CollectionExists(ctx, collectionName)
	if err != nil {
		return fmt.Errorf("qdrant: check collection: %w", err)
	}
	if !exists {
		if err := client.CreateCollection(ctx, &qdrant.CreateCollection{
			CollectionName: collectionName,
			VectorsConfig: &qdrant.VectorsConfig{
				Config: &qdrant.VectorsConfig_Params{
					Params: &qdrant.VectorParams{
						Size:     1536,
						Distance: qdrant.Distance_Cosine,
					},
				},
			},
		}); err != nil {
			return fmt.Errorf("qdrant: create collection: %w", err)
		}
	}

	// Always ensure payload indexes exist — required for filtering by these fields.
	// CreateFieldIndex is idempotent: safe to call on an existing index.
	keywordIndex := qdrant.FieldType_FieldTypeKeyword
	for _, field := range []string{"user_id", "type"} {
		if _, err := client.CreateFieldIndex(ctx, &qdrant.CreateFieldIndexCollection{
			CollectionName: collectionName,
			FieldName:      field,
			FieldType:      &keywordIndex,
		}); err != nil {
			return fmt.Errorf("qdrant: create index on %s: %w", field, err)
		}
	}
	boolIndex := qdrant.FieldType_FieldTypeBool
	if _, err := client.CreateFieldIndex(ctx, &qdrant.CreateFieldIndexCollection{
		CollectionName: collectionName,
		FieldName:      "is_active",
		FieldType:      &boolIndex,
	}); err != nil {
		return fmt.Errorf("qdrant: create index on is_active: %w", err)
	}
	return nil
}

// splitHostPort splits "host:port" into host and port int.
// If no port is present, returns 6334 (Qdrant gRPC default).
func splitHostPort(hostport string) (host string, port int) {
	h, p, err := net.SplitHostPort(hostport)
	if err != nil {
		// No port in the string — use the host as-is with the default port.
		return hostport, 6334
	}
	var portNum int
	fmt.Sscanf(p, "%d", &portNum)
	if portNum == 0 {
		portNum = 6334
	}
	return h, portNum
}

func (s *QdrantStore) Upsert(ctx context.Context, id, userID uuid.UUID, vector []float32, memType string) error {
	_, err := s.client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: collectionName,
		Points: []*qdrant.PointStruct{
			{
				Id:      qdrant.NewID(id.String()),
				Vectors: qdrant.NewVectors(vector...),
				Payload: map[string]*qdrant.Value{
					"user_id":   qdrant.NewValueString(userID.String()),
					"type":      qdrant.NewValueString(memType),
					"is_active": {Kind: &qdrant.Value_BoolValue{BoolValue: true}},
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("qdrant: upsert point %s: %w", id, err)
	}
	return nil
}

func (s *QdrantStore) Search(ctx context.Context, userID uuid.UUID, vector []float32, limit int) ([]SearchResult, error) {
	resp, err := s.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: collectionName,
		Query:          qdrant.NewQueryDense(vector),
		Limit:          ptrUint64(uint64(limit)),
		Filter: &qdrant.Filter{
			Must: []*qdrant.Condition{
				qdrant.NewMatchKeyword("user_id", userID.String()),
				qdrant.NewMatchBool("is_active", true),
			},
		},
		WithPayload: qdrant.NewWithPayload(false),
	})
	if err != nil {
		return nil, fmt.Errorf("qdrant: search: %w", err)
	}

	results := make([]SearchResult, 0, len(resp))
	for _, hit := range resp {
		id, err := uuid.Parse(hit.Id.GetUuid())
		if err != nil {
			continue
		}
		results = append(results, SearchResult{ID: id, Score: hit.Score})
	}
	return results, nil
}

func (s *QdrantStore) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.client.Delete(ctx, &qdrant.DeletePoints{
		CollectionName: collectionName,
		Points: &qdrant.PointsSelector{
			PointsSelectorOneOf: &qdrant.PointsSelector_Points{
				Points: &qdrant.PointsIdsList{
					Ids: []*qdrant.PointId{qdrant.NewID(id.String())},
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("qdrant: delete point %s: %w", id, err)
	}
	return nil
}

func (s *QdrantStore) SetInative(ctx context.Context, id uuid.UUID) error {
	_, err := s.client.SetPayload(ctx, &qdrant.SetPayloadPoints{
		CollectionName: collectionName,
		PointsSelector: &qdrant.PointsSelector{
			PointsSelectorOneOf: &qdrant.PointsSelector_Points{
				Points: &qdrant.PointsIdsList{
					Ids: []*qdrant.PointId{qdrant.NewID(id.String())},
				},
			},
		},
		Payload: map[string]*qdrant.Value{
			"is_active": {Kind: &qdrant.Value_BoolValue{BoolValue: false}},
		},
	})
	if err != nil {
		return fmt.Errorf("qdrant: set inactive %s: %w", id, err)
	}
	return nil
}

func ptrUint64(v uint64) *uint64 { return &v }
