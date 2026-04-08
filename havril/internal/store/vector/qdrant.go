package vector

import (
	"context"
	"crypto/tls"
	"fmt"

	"github.com/google/uuid"
	"github.com/qdrant/go-client/qdrant"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// apiKeyCredentials injects the Qdrant API key into every gRPC call.
type apiKeyCredentials struct{ key string }

func (a apiKeyCredentials) GetRequestMetadata(_ context.Context, _ ...string) (map[string]string, error) {
	return map[string]string{"api-key": a.key}, nil
}
func (a apiKeyCredentials) RequireTransportSecurity() bool { return true }

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

// the production Store backed by Qdrant gRPC.
type QdrantStore struct {
	client qdrant.PointsClient
	conn   *grpc.ClientConn
}

// New connects to Qdrant over gRPC and returns a ready Store.
// host should be "localhost:6334" (the default Qdrant gRPC port).
// If apiKey is non-empty, TLS + API-key auth are used (required for Qdrant Cloud).
func New(host, apiKey string) (*QdrantStore, error) {
	opts := dialOpts(apiKey)
	conn, err := grpc.NewClient(host, opts...)
	if err != nil {
		return nil, fmt.Errorf("qdrant: failed to connect to %s: %w", host, err)
	}
	return &QdrantStore{
		client: qdrant.NewPointsClient(conn),
		conn:   conn,
	}, nil
}

// dialOpts returns the gRPC dial options for the given API key.
// No key → plain insecure (local dev); key present → TLS + per-RPC API-key header.
func dialOpts(apiKey string) []grpc.DialOption {
	if apiKey == "" {
		return []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	}
	return []grpc.DialOption{
		grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{})),
		grpc.WithPerRPCCredentials(apiKeyCredentials{key: apiKey}),
	}
}

func (s *QdrantStore) Close() error {
	return s.conn.Close()
}

func EnsureCollection(ctx context.Context, host, apiKey string) error {
	opts := dialOpts(apiKey)
	conn, err := grpc.NewClient(host, opts...)
	if err != nil {
		return fmt.Errorf("qdrant: connect for setup: %w", err)
	}
	defer conn.Close()

	cc := qdrant.NewCollectionsClient(conn)

	resp, err := cc.List(ctx, &qdrant.ListCollectionsRequest{})
	if err != nil {
		return fmt.Errorf("qdrant: list collections: %w", err)

	}
	for _, c := range resp.Collections {
		if c.Name == collectionName {
			return nil
		}
	}

	_, err = cc.Create(ctx, &qdrant.CreateCollection{
		CollectionName: collectionName,
		VectorsConfig: &qdrant.VectorsConfig{
			Config: &qdrant.VectorsConfig_Params{
				Params: &qdrant.VectorParams{
					Size:     1536,
					Distance: qdrant.Distance_Cosine,
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("qdrant: create collection: %w", err)
	}
	return nil
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
	resp, err := s.client.Search(ctx, &qdrant.SearchPoints{
		CollectionName: collectionName,
		Vector:         vector,
		Limit:          uint64(limit),
		Filter: &qdrant.Filter{
			Must: []*qdrant.Condition{
				{
					ConditionOneOf: &qdrant.Condition_Field{
						Field: &qdrant.FieldCondition{
							Key: "user_id",
							Match: &qdrant.Match{
								MatchValue: &qdrant.Match_Keyword{
									Keyword: userID.String(),
								},
							},
						},
					},
				},
				{
					ConditionOneOf: &qdrant.Condition_Field{
						Field: &qdrant.FieldCondition{
							Key: "is_active",
							Match: &qdrant.Match{
								MatchValue: &qdrant.Match_Boolean{Boolean: true},
							},
						},
					},
				},
			},
		},
		WithPayload: &qdrant.WithPayloadSelector{
			SelectorOptions: &qdrant.WithPayloadSelector_Enable{Enable: false},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("qdrant: search: %w", err)
	}

	results := make([]SearchResult, 0, len(resp.Result))
	for _, hit := range resp.Result {
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
