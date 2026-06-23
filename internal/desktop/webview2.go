package desktop

import (
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strconv"
)

// WebView2Runner handles WebView2 integration on Windows
type WebView2Runner struct {
	port  int
	url   string
	debug bool
}

// NewWebView2Runner creates a new WebView2Runner
func NewWebView2Runner(port int, url string, debug bool) *WebView2Runner {
	return &WebView2Runner{
		port:  port,
		url:   url,
		debug: debug,
	}
}

// findAvailablePort finds an available port
func findAvailablePort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port, nil
}

// Run starts the WebView2 window
func (w *WebView2Runner) Run() error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("WebView2 is only supported on Windows")
	}

	// WebView2가 설치되어 있는지 확인
	if err := w.checkWebView2(); err != nil {
		log.Printf("WebView2 not found, falling back to browser: %v", err)
		return w.openInBrowser()
	}

	// WebView2 앱 실행
	return w.launchWebView2()
}

// checkWebView2 checks if WebView2 runtime is installed
func (w *WebView2Runner) checkWebView2() error {
	// WebView2 런타임 확인 (레지스트리 또는 파일 존재 확인)
	// 간단한 확인: edge://version 페이지에 접근 가능한지 확인
	cmd := exec.Command("reg", "query",
		"HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BFE-63F245AF23F2}",
		"/v", "pv")

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("WebView2 not installed")
	}

	fmt.Printf("WebView2 version: %s\n", string(output))
	return nil
}

// launchWebView2 launches the WebView2 window
func (w *WebView2Runner) launchWebView2() error {
	// WebView2를 사용하는 간단한 HTML 앱 생성
	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Orbit Code</title>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        iframe { width: 100%%; height: 100%%; border: none; }
    </style>
</head>
<body>
    <iframe src="%s"></iframe>
</body>
</html>`, w.url)

	// 임시 HTML 파일 생성
	tempFile := fmt.Sprintf("%s\\orbit-webview.html", os.Getenv("TEMP"))
	if err := os.WriteFile(tempFile, []byte(htmlContent), 0644); err != nil {
		return fmt.Errorf("failed to create temp HTML: %w", err)
	}

	// WebView2 실행 (PowerShell 사용)
	psScript := fmt.Sprintf(`
Add-Type -AssemblyName Microsoft.Web.WebView2.WinForms
$form = New-Object System.Windows.Forms.Form
$form.Text = "Orbit Code"
$form.Size = New-Object System.Drawing.Size(1200, 800)
$form.StartPosition = "CenterScreen"

$webView = New-Object Microsoft.Web.WebView2.WinForms.WebView2
$webView.Dock = "Fill"
$form.Controls.Add($webView)

$webView.CoreWebView2.Navigate("%s")

$form.ShowDialog()
`, w.url)

	cmd := exec.Command("powershell", "-Command", psScript)
	return cmd.Start()
}

// openInBrowser opens the URL in the default browser
func (w *WebView2Runner) openInBrowser() error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", w.url)
	case "darwin":
		cmd = exec.Command("open", w.url)
	case "linux":
		cmd = exec.Command("xdg-open", w.url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

// GetPort returns the port number as a string
func (w *WebView2Runner) GetPort() string {
	return strconv.Itoa(w.port)
}
