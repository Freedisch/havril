package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/freedisch/havril/pkg/models"
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

func buildExtractionPrompt(conversation []models.Message) string {
	var buf bytes.Buffer
	for _, msg := range conversation {
		buf.WriteString(msg.Role)
		buf.WriteString(": ")
		buf.WriteString(msg.Content)
		buf.WriteString("\n")
	}
	return buf.String()
}

func (e *Extractor) extract(ctx context.Context, conversation []models.Message) ([]candidateMemory, error) {
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

	// Parse the structured JSON inside the LLM's message content.
	// Strip markdown code fences that the model sometimes wraps around its output.
	raw := stripCodeFence(completion.Choices[0].Message.Content)
	var result extractionResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		slog.Warn("extractor: failed to parse LLM response as JSON, treating as zero memories",
			"error", err,
			"raw", raw,
		)
		return nil, nil
	}

	return result.Memories, nil
}

// stripCodeFence removes optional markdown code fences that the model sometimes
// wraps around its JSON output (e.g. ```json\n...\n```).
func stripCodeFence(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		// Remove the opening fence line
		if idx := strings.Index(s, "\n"); idx != -1 {
			s = s[idx+1:]
		}
		// Remove the closing fence
		if idx := strings.LastIndex(s, "```"); idx != -1 {
			s = s[:idx]
		}
		s = strings.TrimSpace(s)
	}
	return s
}

const extractionSystemPrompt = `You are a memory extraction engine. Read the conversation 
and extract two categories of memories about the USER ONLY.

CATEGORY 1 — PERSONAL FACTS (type: semantic, episodic, or procedural)
Brief facts about who the user is, their preferences, decisions, background.
Keep these concise — one clear sentence each.
Examples:
- "User is based in Kigali, Rwanda"
- "User prefers concise technical answers"
- "User decided to use REST over gRPC for their API"

CATEGORY 2 — PROJECT CONTEXT (type: project)
Rich, detailed technical snapshots of work in progress. These are meant to be 
fed into another AI to continue work — so include everything that matters:
architecture decisions, tech stack, current state, problems encountered and solved,
patterns used, next steps. Write these as dense technical paragraphs, not bullet points.
A project memory should be long enough that another AI could pick up the work 
from scratch without needing further explanation.

Examples of a GOOD project memory:
"User is building MemoAI, a Go REST API using Chi router, GORM with Postgres, 
and Qdrant for vector search. Auth uses gothgorm (OAuth via Google/GitHub). 
Memory storage: Postgres is source of truth, Qdrant is a derived index keyed 
by the same UUID. Write order on Create: Postgres first, then Qdrant. Write 
order on Delete: Qdrant first, then Postgres. Embedding service uses OpenAI 
text-embedding-3-small (1536 dims). The Memory Engine pipeline: extract via 
gpt-4o-mini → dedup at 0.92 threshold → contradiction check at 0.75-0.85 band 
→ classify → score → store. Current issue: Qdrant Cloud requires a payload index 
on user_id before filtered searches work."

DO NOT extract:
- Questions the user asked
- The assistant's responses or opinions  
- Temporary or one-off statements with no future relevance
- Generic statements that apply to everyone

Respond with this exact JSON format:
{
  "memories": [
    {
      "content": "...",
      "type": "semantic | episodic | procedural | project",
      "importance_hint": 0.0 to 1.0,
      "tags": ["tag1", "tag2"]
    }
  ]
}

For project memories, set importance_hint to 0.9 or higher.
If there is nothing worth remembering, return: {"memories": []}`