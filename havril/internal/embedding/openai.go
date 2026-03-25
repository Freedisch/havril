package embedding

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	openAIEmbeddingURL = "https://api.openai.com/v1/embeddings"
	openAIDefaultModel = "text-embedding-3-small"
	openAIExpectedDims = 1536

	defaultTimeout    = 15 * time.Second
	defaultMaxRetries = 3
	retryBaseDelay    = 500 * time.Millisecond
	maxInputBytes     = 8000
)

type ErrOpenAI struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *ErrOpenAI) Error() string {
	return fmt.Sprintf("openai [%d] %s: %s", e.StatusCode, e.Code, e.Message)
}

func (e *ErrOpenAI) isRetryable() bool {
	return e.StatusCode == http.StatusTooManyRequests ||
		e.StatusCode == http.StatusInternalServerError ||
		e.StatusCode == http.StatusBadGateway ||
		e.StatusCode == http.StatusServiceUnavailable
}

// This pattern lets tests inject a custom HTTP client without
// exposing any fields or backdoor constructors in production code
type Option func(*OpenAIEmbedder)

func WriteMaxRetries(n int) Option {
	return func(e *OpenAIEmbedder) { e.maxRetries = n }
}

type OpenAIEmbedder struct {
	apiKey     string
	model      string
	httpClient *http.Client
	maxRetries int
}

func NewOpenAIEmbedder(apiKey, model string, opts ...Option) *OpenAIEmbedder {
	if model == "" {
		model = openAIDefaultModel
	}
	e := &OpenAIEmbedder{
		apiKey:     apiKey,
		model:      model,
		maxRetries: defaultMaxRetries,
		httpClient: &http.Client{Timeout: defaultTimeout},
	}

	for _, o := range opts {
		o(e)
	}
	return e
}

func (e *OpenAIEmbedder) HTTPClient() *http.Client { return e.httpClient }

type openAIRequest struct {
	Input string `json:"input"`
	Model string `json:"model"`
}

type openAIResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    any    `json:"code"`
	} `json:"error"`
}

func (e *OpenAIEmbedder) doRequest(ctx context.Context, payload []byte) ([]float32, *ErrOpenAI, error) {
	req, err := http.NewRequestWithContext(
		ctx, http.MethodPost, openAIEmbeddingURL, bytes.NewReader(payload),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("embedding: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.apiKey)
	req.Header.Set("User-Agent", "havril/1.0")

	resp, err := e.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("embedding: http request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, nil, fmt.Errorf("embedding: read response: %w", err)
	}

	var result openAIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, nil, fmt.Errorf("embedding: read response: %w", err)
	}

	if result.Error != nil {
		return nil, &ErrOpenAI{
			StatusCode: resp.StatusCode,
			Code:       fmt.Sprintf("%v", result.Error.Code),
			Message:    result.Error.Message,
		}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, &ErrOpenAI{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("unexpected HTTP status %d", resp.StatusCode),
		}, nil
	}

	if len(result.Data) == 0 || len(result.Data[0].Embedding) == 0 {
		return nil, nil, fmt.Errorf("embedding: openai returned empty embedding data")
	}

	vector := result.Data[0].Embedding
	if len(vector) != openAIExpectedDims {
		return nil, nil, fmt.Errorf("embedding: expected %d dims, got %d", openAIExpectedDims, len(vector))
	}

	return vector, nil, nil
}

func (e *OpenAIEmbedder) Embed(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("embedding: input text is empty")
	}

	if len(text) > maxInputBytes {
		text = text[:maxInputBytes]
	}

	payload, err := json.Marshal(openAIRequest{Input: text, Model: e.model})
	if err != nil {
		return nil, fmt.Errorf("embedding: marshal request: %w", err)
	}

	var lastAPIErr *ErrOpenAI
	for attempt := 0; attempt <= e.maxRetries; attempt++ {
		if attempt > 0 {
			wait := retryBaseDelay * time.Duration(attempt)
			select {
			case <-time.After(wait):
			case <-ctx.Done():
				return nil, fmt.Errorf("embedding: context cancelled while waiting to retry: %w", ctx.Err())
			}
		}
		vector, apiErr, err := e.doRequest(ctx, payload)
		if err != nil {
			return nil, err
		}
		if apiErr == nil {
			return vector, nil
		}

		if !apiErr.isRetryable() {
			return nil, apiErr
		}
		lastAPIErr = apiErr
	}

	return nil, fmt.Errorf("embedding: gave up after %d attempts: %w", e.maxRetries+1, lastAPIErr)

}
