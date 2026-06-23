package desktop

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/Edward-Lucas/Orbit-Code/internal/ipc"
)

// App represents the desktop application
type App struct {
	projectPath string
	ipcServer   *ipc.Server
	window      *Window
	uiPort      int
	ipcPort     int
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
		uiPort:      8080,
		ipcPort:     9090,
	}
}

// Run starts the desktop application
func (a *App) Run() error {
	uiURL := fmt.Sprintf("http://localhost:%d", a.uiPort)

	// UI 파일 경로
	uiPath := filepath.Join(a.projectPath, "packages", "webview-ui")

	// UI 서버 시작 (백그라운드)
	go a.startUIServer(a.uiPort, uiPath)

	// IPC 서버 시작
	go a.ipcServer.Start(a.ipcPort)

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
	log.Printf("UI server starting on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Printf("UI server error: %v", err)
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

// runWindows starts the app on Windows using WebView2
func (a *App) runWindows() error {
	fmt.Printf("Starting Orbit Code on Windows...\n")
	fmt.Printf("Window: %dx%d - %s\n", a.window.Width, a.window.Height, a.window.Title)
	fmt.Printf("Project: %s\n", a.projectPath)
	fmt.Printf("UI URL: %s\n", a.window.URL)
	fmt.Printf("IPC Port: %d\n", a.ipcPort)

	// WebView2 실행
	webView := NewWebView2Runner(a.uiPort, a.window.URL, true)
	if err := webView.Run(); err != nil {
		log.Printf("WebView2 failed, falling back to browser: %v", err)
		return a.openInBrowser()
	}

	// 서버 종료 대기
	select {}
}

// runMacOS starts the app on macOS
func (a *App) runMacOS() error {
	fmt.Printf("Starting Orbit Code on macOS...\n")
	// macOS에서는 WebKit 사용 (추후 구현)
	return a.openInBrowser()
}

// runLinux starts the app on Linux
func (a *App) runLinux() error {
	fmt.Printf("Starting Orbit Code on Linux...\n")
	// Linux에서는 WebKitGTK 사용 (추후 구현)
	return a.openInBrowser()
}

// openInBrowser opens the URL in the default browser
func (a *App) openInBrowser() error {
	fmt.Printf("\nOpen %s in your browser to use Orbit Code\n", a.window.URL)
	fmt.Printf("Press Ctrl+C to exit\n")

	// 브라우저 열기
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start", a.window.URL}
	case "darwin":
		cmd = "open"
		args = []string{a.window.URL}
	case "linux":
		cmd = "xdg-open"
		args = []string{a.window.URL}
	}

	if cmd != "" {
		go func() {
			c := exec.Command(cmd, args...)
			c.Start()
		}()
	}

	// 시그널 대기
	select {}
}
