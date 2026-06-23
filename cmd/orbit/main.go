package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/Edward-Lucas/Orbit-Code/internal/desktop"
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

	// IPC 서버 시작
	ipcServer := ipc.NewServer()

	// 데스크탑 앱 시작
	app := desktop.NewApp(absPath, ipcServer)
	if err := app.Run(); err != nil {
		log.Fatalf("Failed to run app: %v", err)
	}
}
