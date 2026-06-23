package ipc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// AIChatPayload represents the payload for AI chat
type AIChatPayload struct {
	Message string `json:"message"`
	Context string `json:"context,omitempty"`
	Model   string `json:"model,omitempty"`
}

// AIConfig holds AI API configuration
type AIConfig struct {
	APIKey      string
	Endpoint    string
	Model       string
	MaxTokens   int
	Temperature float64
}

// AIClient handles AI API communication
type AIClient struct {
	config     AIConfig
	httpClient *http.Client
}

// ChatMessage represents a message in the chat
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest represents the API request
type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens"`
	Temperature float64       `json:"temperature"`
	Stream      bool          `json:"stream"`
}

// ChatResponse represents the API response
type ChatResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// NewAIClient creates a new AI client
func NewAIClient(config AIConfig) *AIClient {
	return &AIClient{
		config: config,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Chat sends a message to the AI and returns the response
func (c *AIClient) Chat(message string, context string) (string, error) {
	// 시스템 프롬프트 생성
	systemPrompt := c.buildSystemPrompt(context)

	// 메시지 구성
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: message},
	}

	// 요청 생성
	request := ChatRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxTokens,
		Temperature: c.config.Temperature,
		Stream:      false,
	}

	// JSON 직렬화
	requestBody, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// API 호출
	req, err := http.NewRequest("POST", c.config.Endpoint, bytes.NewBuffer(requestBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call AI API: %w", err)
	}
	defer resp.Body.Close()

	// 응답 읽기
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// 응답 파싱
	var chatResponse ChatResponse
	if err := json.Unmarshal(body, &chatResponse); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// 응답 확인
	if len(chatResponse.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return chatResponse.Choices[0].Message.Content, nil
}

// buildSystemPrompt builds the system prompt
func (c *AIClient) buildSystemPrompt(context string) string {
	prompt := `You are Orbit Code AI, an expert coding assistant integrated into the Orbit Code editor.
You help developers with:
- Writing and explaining code
- Debugging issues
- Code review and suggestions
- Architecture decisions
- Best practices

Be concise, helpful, and focus on actionable guidance.
When providing code, use proper formatting with code blocks.`

	if context != "" {
		prompt += fmt.Sprintf("\n\nCurrent code context:\n```\n%s\n```", context)
	}

	return prompt
}

// RegisterAIHandlers registers AI-related IPC handlers
func RegisterAIHandlers(server *Server, aiClient *AIClient) {
	// AI 채팅
	server.RegisterHandler("ai.chat", func(msg *Message) (*Response, error) {
		var payload AIChatPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return nil, fmt.Errorf("invalid payload: %w", err)
		}

		response, err := aiClient.Chat(payload.Message, payload.Context)
		if err != nil {
			return nil, fmt.Errorf("AI chat failed: %w", err)
		}

		data, _ := json.Marshal(map[string]string{
			"response": response,
		})

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})

	// AI 모델 목록
	server.RegisterHandler("ai.models", func(msg *Message) (*Response, error) {
		models := []map[string]string{
			{"id": "mimo-7b", "name": "MiMo-7B", "provider": "xiaomimimo"},
			{"id": "mimo-13b", "name": "MiMo-13B", "provider": "xiaomimimo"},
		}

		data, _ := json.Marshal(models)

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})

	// AI 상태 확인
	server.RegisterHandler("ai.status", func(msg *Message) (*Response, error) {
		data, _ := json.Marshal(map[string]interface{}{
			"configured": aiClient.config.APIKey != "",
			"endpoint":   aiClient.config.Endpoint,
			"model":      aiClient.config.Model,
		})

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})
}
