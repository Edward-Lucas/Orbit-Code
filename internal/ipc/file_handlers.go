package ipc

import (
	"encoding/json"
	"fmt"

	"github.com/Edward-Lucas/Orbit-Code/internal/editor"
)

// FilePayload represents the payload for file operations
type FilePayload struct {
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
}

// RegisterFileHandlers registers file-related IPC handlers
func RegisterFileHandlers(server *Server, fm *editor.FileManager) {
	// 파일 트리 가져오기
	server.RegisterHandler("file.tree", func(msg *Message) (*Response, error) {
		tree, err := fm.GetFileTree(5) // max depth 5
		if err != nil {
			return nil, fmt.Errorf("failed to get file tree: %w", err)
		}

		data, err := json.Marshal(tree)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal file tree: %w", err)
		}

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})

	// 파일 읽기
	server.RegisterHandler("file.read", func(msg *Message) (*Response, error) {
		var payload FilePayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return nil, fmt.Errorf("invalid payload: %w", err)
		}

		content, err := fm.ReadFile(payload.Path)
		if err != nil {
			return nil, fmt.Errorf("failed to read file: %w", err)
		}

		data, _ := json.Marshal(map[string]string{
			"path":    payload.Path,
			"content": content,
		})

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})

	// 파일 쓰기
	server.RegisterHandler("file.write", func(msg *Message) (*Response, error) {
		var payload FilePayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return nil, fmt.Errorf("invalid payload: %w", err)
		}

		if err := fm.WriteFile(payload.Path, payload.Content); err != nil {
			return nil, fmt.Errorf("failed to write file: %w", err)
		}

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    []byte(`{"status":"ok"}`),
		}, nil
	})

	// 파일 목록 (단순)
	server.RegisterHandler("file.list", func(msg *Message) (*Response, error) {
		var payload struct {
			Path string `json:"path"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return nil, fmt.Errorf("invalid payload: %w", err)
		}

		tree, err := fm.GetFileTree(1) // 단일 레벨만
		if err != nil {
			return nil, fmt.Errorf("failed to list files: %w", err)
		}

		data, err := json.Marshal(tree)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal file list: %w", err)
		}

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})

	// 프로젝트 경로 반환
	server.RegisterHandler("project.path", func(msg *Message) (*Response, error) {
		data, _ := json.Marshal(map[string]string{
			"path": fm.GetRootPath(),
		})

		return &Response{
			ID:      msg.ID,
			Success: true,
			Data:    data,
		}, nil
	})
}
