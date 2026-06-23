package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/Edward-Lucas/Orbit-Code/internal/desktop"
	"github.com/Edward-Lucas/Orbit-Code/internal/editor"
	"github.com/Edward-Lucas/Orbit-Code/internal/ipc"
)

func main() {
	// 프로젝트 경로 설정
	projectPath := "."
	if len(os.Args) > 1 {
		projectPath = os.Args[1]
	}

	// 절대 경로로 변환
	absPath, err := filepath.Abs(projectPath)
	if err != nil {
		log.Fatalf("Failed to resolve path: %v", err)
	}

	// 프로젝트 존재 확인
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		log.Fatalf("Path does not exist: %s", absPath)
	}

	fmt.Printf("Orbit Code - AI-Powered Code Editor\n")
	fmt.Printf("Project: %s\n", absPath)

	// 파일 매니저 생성
	fileManager := editor.NewFileManager(absPath)

	// IPC 서버 시작
	ipcServer := ipc.NewServer()

	// 파일 핸들러 등록
	ipc.RegisterFileHandlers(ipcServer, fileManager)

	// AI 클라이언트 생성 및 핸들러 등록
	aiConfig := ipc.AIConfig{
		APIKey:      os.Getenv("ORBIT_AI_API_KEY"),
		Endpoint:    getEnvOrDefault("ORBIT_AI_ENDPOINT", "https://api.xiaomimimo.com/v1/chat/completions"),
		Model:       getEnvOrDefault("ORBIT_AI_MODEL", "mimo-7b"),
		MaxTokens:   2048,
		Temperature: 0.7,
	}

	// API 키가 환경 변수에 없으면 기본값 사용 (테스트용)
	if aiConfig.APIKey == "" {
		aiConfig.APIKey = "sk-sy20yoygb1abw66dm9uczwqz8uj6ev5jc75mqpif8je9o9pd"
		log.Println("Warning: Using default API key for testing only")
	}

	aiClient := ipc.NewAIClient(aiConfig)
	ipc.RegisterAIHandlers(ipcServer, aiClient)

	fmt.Printf("AI Endpoint: %s\n", aiConfig.Endpoint)
	fmt.Printf("AI Model: %s\n", aiConfig.Model)

	// 데스크탑 앱 시작
	app := desktop.NewApp(absPath, ipcServer)
	if err := app.Run(); err != nil {
		log.Fatalf("Failed to run app: %v", err)
	}
}

// getEnvOrDefault returns the environment variable or a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
