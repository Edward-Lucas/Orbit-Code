package desktop

import (
	"fmt"
	"net/http"
	"path/filepath"
	"runtime"

	"github.com/Edward-Lucas/Orbit-Code/internal/ipc"
)

// App represents the desktop application
type App struct {
	projectPath string
	ipcServer   *ipc.Server
	window      *Window
}

// Window represents a desktop window
type Window struct {
	Title     string
	Width     int
	Height    int
	URL       string
	Resizable bool
}

// NewApp creates a new desktop application instance
func NewApp(projectPath string, ipcServer *ipc.Server) *App {
	return &App{
		projectPath: projectPath,
		ipcServer:   ipcServer,
	}
}

// Run starts the desktop application
func (a *App) Run() error {
	// Webview UI 서버 시작
	uiPort := 8080
	uiURL := fmt.Sprintf("http://localhost:%d", uiPort)

	// UI 파일 경로
	uiPath := filepath.Join(a.projectPath, "packages", "webview-ui")

	// UI 서버 시작 (백그라운드)
	go a.startUIServer(uiPort, uiPath)

	// IPC 서버 시작
	go a.ipcServer.Start(9090)

	// 윈도우 생성
	a.window = &Window{
		Title:     "Orbit Code",
		Width:     1200,
		Height:    800,
		URL:       uiURL,
		Resizable: true,
	}

	// 플랫폼별 윈도우 실행
	return a.runWindow()
}

// startUIServer starts the UI file server
func (a *App) startUIServer(port int, uiPath string) {
	http.Handle("/", http.FileServer(http.Dir(uiPath)))
	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("UI server starting on %s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		fmt.Printf("UI server error: %v\n", err)
	}
}

// runWindow creates and shows the window
func (a *App) runWindow() error {
	switch runtime.GOOS {
	case "windows":
		return a.runWindows()
	case "darwin":
		return a.runMacOS()
	case "linux":
		return a.runLinux()
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
}

// runWindows starts the app on Windows
func (a *App) runWindows() error {
	fmt.Printf("Starting Orbit Code on Windows...\n")
	fmt.Printf("Window: %dx%d - %s\n", a.window.Width, a.window.Height, a.window.Title)
	fmt.Printf("Project: %s\n", a.projectPath)
	fmt.Printf("UI URL: %s\n", a.window.URL)

	// TODO: WebView2 통합
	// 현재는 브라우저에서 UI를 열도록 안내
	fmt.Printf("\nOpen %s in your browser to use Orbit Code\n", a.window.URL)
	fmt.Printf("Press Ctrl+C to exit\n")

	// 시그널 대기
	select {}
}

// runMacOS starts the app on macOS
func (a *App) runMacOS() error {
	fmt.Printf("Starting Orbit Code on macOS...\n")
	// TODO: WebKit 통합
	return nil
}

// runLinux starts the app on Linux
func (a *App) runLinux() error {
	fmt.Printf("Starting Orbit Code on Linux...\n")
	// TODO: WebKitGTK 통합
	return nil
}
