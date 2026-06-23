package ipc

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

// Server represents the IPC server for communication between Go and TypeScript
type Server struct {
	port     int
	handlers map[string]Handler
	mu       sync.RWMutex
}

// Handler is a function that handles an IPC message
type Handler func(message *Message) (*Response, error)

// Message represents an IPC message
type Message struct {
	ID      string          `json:"id"`
	Type    string          `json:"type"`
	Method  string          `json:"method"`
	Payload json.RawMessage `json:"payload"`
}

// Response represents an IPC response
type Response struct {
	ID      string          `json:"id"`
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
}

// NewServer creates a new IPC server
func NewServer() *Server {
	return &Server{
		handlers: make(map[string]Handler),
	}
}

// RegisterHandler registers a handler for a method
func (s *Server) RegisterHandler(method string, handler Handler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[method] = handler
}

// Start starts the IPC server
func (s *Server) Start(port int) error {
	s.port = port

	mux := http.NewServeMux()
	mux.HandleFunc("/ipc", s.handleIPC)
	mux.HandleFunc("/health", s.handleHealth)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("IPC server starting on %s", addr)
	return http.ListenAndServe(addr, mux)
}

// handleIPC handles IPC requests
func (s *Server) handleIPC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var msg Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 핸들러 찾기
	s.mu.RLock()
	handler, exists := s.handlers[msg.Method]
	s.mu.RUnlock()

	if !exists {
		sendResponse(w, &Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown method: %s", msg.Method),
		})
		return
	}

	// 핸들러 실행
	resp, err := handler(&msg)
	if err != nil {
		sendResponse(w, &Response{
			ID:      msg.ID,
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	sendResponse(w, resp)
}

// handleHealth handles health check requests
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

// sendResponse sends a JSON response
func sendResponse(w http.ResponseWriter, resp *Response) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
