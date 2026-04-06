package engine

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
	openAIChatURL      = "https://api.openai.com/v1/chat/completions"
	extractorModel     = "gpt-4o-mini"
	extractorTimeout   = 30 * time.Second
	extractorMaxTokens = 1000
)

type candidateMemory struct {
	Content        string   `json:"content"`
	Type           string   `json:"type"`
	ImportanceHint float64  `json:"importance_hint"`
	Tags           []string `json:"Tags"`
}

type extractionResult struct {
	Memories []candidateMemory `json:"memories"`
}

type Extractor struct {
	apiKey     string
	httpClient *http.Client
}

func newExtractor(apiKey string) *Extractor {
	return &Extractor{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: extractorTimeout},
	}
}

func buildExtractionPrompt(conversation []Message) string {
	var buf bytes.Buffer
	for _, msg := range conversation {
		buf.WriteString(msg.Role)
		buf.WriteString(": ")
		buf.WriteString(msg.Content)
		buf.WriteString("\n")
	}
	return buf.String()
}

func (e *Extractor) extract(ctx context.Context, conversation []Message) ([]candidateMemory, error) {
	prompt := buildExtractionPrompt(conversation)
	body, err := json.Marshal(map[string]any{
		"model":      extractorModel,
		"max_tokens": extractorMaxTokens,
		"messages": []map[string]string{
			{"role": "system", "content": extractionSystemPrompt},
			{"role": "user", "content": prompt},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("extractor: Marshal request %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIChatURL, bytes.NewReader((body)))
	if err != nil {
		return nil, fmt.Errorf("extractor: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.apiKey)
	req.Header.Set("User-Agent", "havril/1.0")

	resp, err := e.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("extractor: http request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("extractor: read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("extractor: openai status %d: %s", resp.StatusCode, string(respBody))
	}

	var completion struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &completion); err != nil {
		return nil, fmt.Errorf("extractor: decode completion: %w", err)
	}
	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("extractor: openai returned no choices")
	}

	// Parse the structured JSON inside the LLM's message content
	var result extractionResult
	if err := json.Unmarshal([]byte(completion.Choices[0].Message.Content), &result); err != nil {
		// LLM occasionally returns slightly malformed JSON — treat as zero memories
		// rather than failing the whole submission. The conversation is not lost.
		return nil, nil
	}

	return result.Memories, nil
}

const extractionSystemPrompt = `You are a memory extraction engine. Your job is to read a conversation and extract persistent, meaningful facts about the USER ONLY — not about the assistant.
 
Extract facts that would be genuinely useful to remember in future conversations. Focus on:
- Who the user is (job, location, background)
- What they are building or working on
- Decisions they have made
- Preferences and working style
- Skills and technologies they use
 
Do NOT extract:
- Questions the user asked
- Temporary or one-off statements
- Facts about the assistant
- Generic statements with no personal relevance
 
Respond with a JSON object in this exact format:
{
  "memories": [
    {
      "content": "A single clear fact about the user, written as a statement",
      "type": "semantic | episodic | procedural",
      "importance_hint": 0.0 to 1.0,
      "tags": ["tag1", "tag2"]
    }
  ]
}
 
Memory types:
- semantic: persistent facts (who they are, what they know, what they use)
- episodic: things that happened at a point in time (deployed X, decided Y)
- procedural: how they prefer to do things (prefers X, always does Y)
 
If there are no meaningful facts to extract, return: {"memories": []}`
