package editor

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FileNode represents a file or directory in the file tree
type FileNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []*FileNode `json:"children,omitempty"`
	Size     int64       `json:"size,omitempty"`
}

// FileManager handles file system operations
type FileManager struct {
	rootPath string
}

// NewFileManager creates a new FileManager
func NewFileManager(rootPath string) *FileManager {
	return &FileManager{rootPath: rootPath}
}

// GetFileTree returns the file tree starting from rootPath
func (fm *FileManager) GetFileTree(maxDepth int) (*FileNode, error) {
	return fm.buildTree(fm.rootPath, 0, maxDepth)
}

// buildTree recursively builds the file tree
func (fm *FileManager) buildTree(path string, currentDepth, maxDepth int) (*FileNode, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	node := &FileNode{
		Name:  info.Name(),
		Path:  filepath.ToSlash(path), // Use forward slashes for consistency
		IsDir: info.IsDir(),
		Size:  info.Size(),
	}

	if !info.IsDir() {
		return node, nil
	}

	// Max depth check
	if maxDepth > 0 && currentDepth >= maxDepth {
		return node, nil
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return node, nil // Return node without children on error
	}

	// Sort: directories first, then by name
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	node.Children = make([]*FileNode, 0, len(entries))
	for _, entry := range entries {
		// Skip hidden files and common ignore patterns
		if shouldIgnore(entry.Name()) {
			continue
		}

		childPath := filepath.Join(path, entry.Name())
		child, err := fm.buildTree(childPath, currentDepth+1, maxDepth)
		if err != nil {
			continue
		}
		node.Children = append(node.Children, child)
	}

	return node, nil
}

// ReadFile reads the content of a file
func (fm *FileManager) ReadFile(relativePath string) (string, error) {
	fullPath := filepath.Join(fm.rootPath, filepath.FromSlash(relativePath))
	data, err := os.ReadFile(fullPath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFile writes content to a file
func (fm *FileManager) WriteFile(relativePath string, content string) error {
	fullPath := filepath.Join(fm.rootPath, filepath.FromSlash(relativePath))

	// Create directory if it doesn't exist
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, []byte(content), 0644)
}

// GetRootPath returns the root path of the file manager
func (fm *FileManager) GetRootPath() string {
	return fm.rootPath
}

// shouldIgnore returns true if the file/directory should be ignored
func shouldIgnore(name string) bool {
	// Hidden files
	if strings.HasPrefix(name, ".") {
		return true
	}

	// Common ignore patterns
	ignorePatterns := []string{
		"node_modules",
		"__pycache__",
		".git",
		".svn",
		".hg",
		"dist",
		"build",
		".cache",
		".idea",
		".vscode",
		"*.pyc",
		"*.pyo",
		"*.class",
		"*.jar",
	}

	for _, pattern := range ignorePatterns {
		if strings.Contains(name, pattern) {
			return true
		}
	}

	return false
}
