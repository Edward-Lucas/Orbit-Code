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
import { ipc, IPCClient } from './ipc';

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

// File Tree Node
interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  size?: number;
}

// Main App
class OrbitCodeApp {
  private editor: EditorView | null = null;
  private ipc: IPCClient;
  private openFiles: Map<string, string> = new Map(); // path -> content
  private currentFile: string | null = null;

  constructor() {
    this.ipc = ipc;
    this.init();
  }

  private async init(): Promise<void> {
    this.initEditor();
    this.initEventListeners();
    this.loadWelcomeContent();

    // 파일 트리 로드
    await this.loadFileTree();

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
      this.loadFileTree();
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

  private async loadFileTree(): Promise<void> {
    try {
      const fileTree = await this.ipc.getFileTree();
      this.renderFileTree(fileTree);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      // 에러 시 더미 데이터 표시
      this.renderFileTree({
        name: 'root',
        path: '.',
        isDir: true,
        children: [
          { name: 'src', path: 'src', isDir: true, children: [] },
          { name: 'package.json', path: 'package.json', isDir: false },
        ],
      });
    }
  }

  private renderFileTree(node: FileNode, container?: HTMLElement): void {
    const fileTree = document.getElementById('file-tree');
    if (!fileTree) return;

    if (!container) {
      fileTree.innerHTML = '';
      container = fileTree;
    }

    const item = document.createElement('div');
    item.className = `file-item ${node.isDir ? 'folder' : 'file'}`;

    const icon = node.isDir ? '📁' : this.getFileIcon(node.name);
    item.innerHTML = `
      <span class="icon">${icon}</span>
      <span class="name">${node.name}</span>
    `;

    if (!node.isDir) {
      item.addEventListener('click', () => {
        this.openFile(node.path);
      });
    } else if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'children';
      childrenContainer.style.display = 'none';

      node.children.forEach(child => {
        this.renderFileTree(child, childrenContainer);
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = childrenContainer.style.display === 'none';
        childrenContainer.style.display = isHidden ? 'block' : 'none';
        item.querySelector('.icon')!.textContent = isHidden ? '📂' : '📁';
      });

      container.appendChild(item);
      container.appendChild(childrenContainer);
      return;
    }

    container.appendChild(item);
  }

  private getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      js: '📜',
      ts: '📘',
      py: '🐍',
      html: '🌐',
      css: '🎨',
      json: '📋',
      md: '📝',
      go: '🔵',
      rs: '🦀',
    };
    return iconMap[ext || ''] || '📄';
  }

  private onDocumentChanged(): void {
    // 문서 변경 시 처리
    if (this.currentFile && this.editor) {
      this.openFiles.set(this.currentFile, this.editor.state.doc.toString());
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
      // 이미 열려있는 파일인지 확인
      if (this.openFiles.has(path)) {
        this.switchTab(path);
        return;
      }

      const content = await this.ipc.readFile(path);
      this.openFiles.set(path, content);

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

      // 현재 파일 업데이트
      this.currentFile = path;
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

      this.currentFile = path;
      this.updateFileStatus(path);
    }
  }

  private closeTab(path: string): void {
    const tabs = document.getElementById('tabs');
    const tab = tabs?.querySelector(`[data-file="${path}"]`);
    if (tab) {
      tab.remove();
      this.openFiles.delete(path);

      // 닫힌 탭이 현재 파일이면 다른 탭으로 전환
      if (this.currentFile === path) {
        const remainingTabs = tabs?.querySelectorAll('.tab');
        if (remainingTabs && remainingTabs.length > 0) {
          const lastTab = remainingTabs[remainingTabs.length - 1] as HTMLElement;
          this.switchTab(lastTab.dataset.file!);
        } else {
          this.currentFile = null;
          this.loadWelcomeContent();
        }
      }
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

  private async sendAIMessage(): Promise<void> {
    const input = document.getElementById('ai-input') as HTMLTextAreaElement;
    const messages = document.getElementById('ai-messages');

    if (!input || !messages || !input.value.trim()) return;

    const userMessage = input.value.trim();
    input.value = '';

    // 사용자 메시지 추가
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-message user';
    userDiv.innerHTML = `<p>${this.escapeHtml(userMessage)}</p>`;
    messages.appendChild(userDiv);

    // 로딩 표시
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'ai-message assistant';
    assistantDiv.innerHTML = `<p class="typing">AI가 응답을 생성하고 있습니다...</p>`;
    messages.appendChild(assistantDiv);

    // 스크롤
    messages.scrollTop = messages.scrollHeight;

    // IPC를 통해 AI에게 전송
    try {
      const context = this.editor?.state.doc.toString() || '';
      const response = await this.ipc.aiChat(userMessage, context);

      // 응답 포맷팅
      const formattedResponse = this.formatAIResponse(response);
      assistantDiv.innerHTML = formattedResponse;
    } catch (error) {
      assistantDiv.innerHTML = `<p class="error">오류가 발생했습니다: ${error}</p>`;
    }

    // 스크롤
    messages.scrollTop = messages.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatAIResponse(response: string): string {
    // 코드 블록 포맷팅
    let formatted = response.replace(/```(\w+)?\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>');

    // 인라인 코드
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>`);

    // 줄바꿈
    formatted = formatted.replace(/\n/g, '<br>');

    return `<p>${formatted}</p>`;
  }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  new OrbitCodeApp();
});
