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
	extractorTimeout   = 60 * time.Second
	extractorMaxTokens = 4096
)

type candidateMemory struct {
	Content        string   `json:"content"`
	Type           string   `json:"type"`
	ImportanceHint float64  `json:"importance_hint"`
	Tags           []string `json:"tags"`
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

const extractionSystemPrompt = `You are a memory extraction engine. Read the conversation and extract memories.


CATEGORY — WORK CONTEXT (type: project)
A rich, detailed snapshot of whatever the user is working on, studying, or trying to accomplish. The purpose of this memory is to allow the user to paste it into a different AI platform and immediately continue where they left off — so capture everything that matters: the goal, the current state, what has been tried, what worked, what didn't, open questions, and next steps.
 
This applies to ANY kind of work, not just software:
- A coding project → architecture, stack, current bugs, design decisions
- A research paper → thesis, sources found, arguments developed, gaps remaining
- A homework assignment → the question, the approach taken, what the user understands so far
- A learning goal → what the user is learning, what they've covered, what's still unclear
- A creative project → concept, what exists so far, direction, constraints
- A business problem → context, options considered, decision made, next action
 
Write project memories as dense paragraphs, not bullet points. They should be long enough that another AI could pick up the work from scratch without needing further explanation from the user.
 
Example of a GOOD project memory (research):
"User is writing a research paper on the accuracy and compression trade-offs of TurboQuant when applied to tonal African languages, specifically Ewe. The paper argues that standard quantization metrics fail to account for tonal information loss. Current state: literature review complete, methodology section drafted. Main challenge: finding evaluation benchmarks for low-resource tonal languages. Next step: compare WER scores between baseline and quantized models using the WAXAL corpus."
 
Example of a GOOD project memory (homework):
"User is working on a thermodynamics problem set, question 4: calculating the efficiency of a Carnot engine operating between 300K and 800K. User understands the formula η = 1 - Tc/Th but is confused about why the efficiency ceiling cannot be exceeded. Currently stuck on the entropy explanation. Has read the textbook section but found it unclear."
 
Example of a GOOD project memory (coding):
"User is building MemoAI, a Go REST API using Chi router, GORM with Postgres, and Qdrant for vector search. Auth uses gothgorm (OAuth via Google/GitHub). Memory storage: Postgres is source of truth, Qdrant is a derived index. Write order on Create: Postgres first, then Qdrant. Embedding service uses OpenAI text-embedding-3-small (1536 dims). Current issue: Qdrant Cloud requires a payload index on user_id before filtered searches work. Next step: wire the MCP server into the router."

 
Respond with this exact JSON format:
{
  "memories": [
    {
      "content": "...",
      "type": "project",
      "importance_hint": 0.0,
      "tags": ["tag1", "tag2"]
    }
  ]
}

For project memories set importance_hint to 0.9 or higher.
For personal facts set importance_hint between 0.4 and 0.8 based on how specific and useful the fact is.
`
 



