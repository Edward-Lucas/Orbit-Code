/**
 * Orbit Code - Main Entry Point
 * AI-Powered Code Editor
 */

import { EditorView, basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';

// IPC Client for Go communication
class IPCClient {
  private baseUrl: string;

  constructor(port: number = 9090) {
    this.baseUrl = `http://localhost:${port}`;
  }

  async send(method: string, payload: any): Promise<any> {
    const id = crypto.randomUUID();
    const response = await fetch(`${this.baseUrl}/ipc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'request', method, payload }),
    });
    return response.json();
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// File Manager
class FileManager {
  private files: Map<string, string> = new Map();
  private currentFile: string | null = null;

  async loadFileTree(path: string): Promise<void> {
    // IPC를 통해 파일 트리 로드
    console.log('Loading file tree:', path);
  }

  async openFile(path: string): Promise<string> {
    // IPC를 통해 파일 내용 로드
    const content = await this.ipc.send('file.read', { path });
    this.currentFile = path;
    return content.data;
  }

  setCurrentFile(path: string): void {
    this.currentFile = path;
  }

  getCurrentFile(): string | null {
    return this.currentFile;
  }
}

// Language Detector
function getLanguageExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript();
    case 'py':
      return python();
    case 'html':
    case 'htm':
      return html();
    case 'css':
    case 'scss':
      return css();
    case 'json':
      return json();
    default:
      return javascript();
  }
}

// Main App
class OrbitCodeApp {
  private editor: EditorView | null = null;
  private ipc: IPCClient;
  private fileManager: FileManager;
  private openFiles: Map<string, string> = new Map(); // path -> content

  constructor() {
    this.ipc = new IPCClient();
    this.fileManager = new FileManager();
    this.init();
  }

  private init(): void {
    this.initEditor();
    this.initEventListeners();
    this.loadWelcomeContent();
    console.log('Orbit Code initialized');
  }

  private initEditor(): void {
    const editorContainer = document.getElementById('editor');
    if (!editorContainer) return;

    const state = EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        oneDark,
        javascript(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.onDocumentChanged();
          }
          // 커서 위치 업데이트
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          this.updateCursorStatus(line.number, pos - line.from + 1);
        }),
      ],
    });

    this.editor = new EditorView({
      state,
      parent: editorContainer,
    });
  }

  private initEventListeners(): void {
    // File tree refresh
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.refreshFileTree();
    });

    // AI Send button
    document.getElementById('ai-send')?.addEventListener('click', () => {
      this.sendAIMessage();
    });

    // AI Input enter key
    document.getElementById('ai-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendAIMessage();
      }
    });

    // Tab click
    document.getElementById('tabs')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tab-close')) {
        const tab = target.closest('.tab') as HTMLElement;
        if (tab) {
          const file = tab.dataset.file;
          if (file) this.closeTab(file);
        }
      } else if (target.closest('.tab')) {
        const tab = target.closest('.tab') as HTMLElement;
        if (tab) {
          const file = tab.dataset.file;
          if (file) this.switchTab(file);
        }
      }
    });

    // Terminal toggle
    document.getElementById('terminal-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('terminal-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      }
    });

    // AI panel toggle
    document.getElementById('ai-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('ai-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }

  private loadWelcomeContent(): void {
    const welcomeContent = `// Welcome to Orbit Code! 🚀
//
// AI-Powered Code Editor
// Built with Go + TypeScript
//
// Features:
// - CodeMirror 6 Editor
// - AI Assistant Integration
// - File Explorer
// - Terminal Support
//
// Start coding or ask AI for help!

function greet(name: string): string {
  return \`Hello, \${name}! Welcome to Orbit Code.\`;
}

console.log(greet('Developer'));
`;

    if (this.editor) {
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: welcomeContent,
        },
      });
    }
  }

  private onDocumentChanged(): void {
    // 문서 변경 시 처리
    const currentFile = this.fileManager.getCurrentFile();
    if (currentFile && this.editor) {
      this.openFiles.set(currentFile, this.editor.state.doc.toString());
    }
  }

  private updateCursorStatus(line: number, col: number): void {
    const statusCursor = document.getElementById('status-cursor');
    if (statusCursor) {
      statusCursor.textContent = `Ln ${line}, Col ${col}`;
    }
  }

  async openFile(path: string): Promise<void> {
    try {
      const content = await this.fileManager.openFile(path);
      if (this.editor) {
        this.editor.dispatch({
          changes: {
            from: 0,
            to: this.editor.state.doc.length,
            insert: content,
          },
        });
      }

      // 탭 업데이트
      this.addTab(path);

      // 상태 바 업데이트
      this.updateFileStatus(path);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  private addTab(path: string): void {
    const tabs = document.getElementById('tabs');
    if (!tabs) return;

    // 기존 탭 확인
    const existingTab = tabs.querySelector(`[data-file="${path}"]`);
    if (existingTab) {
      this.switchTab(path);
      return;
    }

    // 새 탭 생성
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.file = path;
    tab.innerHTML = `
      <span>${path.split('/').pop()}</span>
      <button class="tab-close">×</button>
    `;
    tabs.appendChild(tab);

    // 탭 활성화
    this.switchTab(path);
  }

  private switchTab(path: string): void {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => tab.classList.remove('active'));

    const activeTab = document.querySelector(`[data-file="${path}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // 파일 내용 로드
    const content = this.openFiles.get(path);
    if (content && this.editor) {
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: content,
        },
      });
    }
  }

  private closeTab(path: string): void {
    const tabs = document.getElementById('tabs');
    const tab = tabs?.querySelector(`[data-file="${path}"]`);
    if (tab) {
      tab.remove();
      this.openFiles.delete(path);
    }
  }

  private updateFileStatus(path: string): void {
    const statusFile = document.getElementById('status-file');
    const statusLang = document.getElementById('status-lang');

    if (statusFile) {
      statusFile.textContent = path;
    }

    if (statusLang) {
      const ext = path.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        js: 'JavaScript',
        ts: 'TypeScript',
        py: 'Python',
        html: 'HTML',
        css: 'CSS',
        json: 'JSON',
        go: 'Go',
        md: 'Markdown',
      };
      statusLang.textContent = langMap[ext || ''] || 'Plain Text';
    }
  }

  private async refreshFileTree(): Promise<void> {
    console.log('Refreshing file tree...');
    // IPC를 통해 파일 트리 새로고침
  }

  private async sendAIMessage(): Promise<void> {
    const input = document.getElementById('ai-input') as HTMLTextAreaElement;
    const messages = document.getElementById('ai-messages');

    if (!input || !messages || !input.value.trim()) return;

    const userMessage = input.value.trim();
    input.value = '';

    // 사용자 메시지 추가
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-message user';
    userDiv.innerHTML = `<p>${userMessage}</p>`;
    messages.appendChild(userDiv);

    // AI 응답 시뮬레이션
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'ai-message assistant';
    assistantDiv.innerHTML = `<p>AI가 응답을 생성하고 있습니다...</p>`;
    messages.appendChild(assistantDiv);

    // 스크롤
    messages.scrollTop = messages.scrollHeight;

    // IPC를 통해 AI에게 전송
    try {
      const response = await this.ipc.send('ai.chat', {
        message: userMessage,
        context: this.editor?.state.doc.toString() || '',
      });

      assistantDiv.innerHTML = `<p>${response.data?.response || '응답을 생성할 수 없습니다.'}</p>`;
    } catch (error) {
      assistantDiv.innerHTML = `<p>오류가 발생했습니다: ${error}</p>`;
    }
  }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  new OrbitCodeApp();
});
