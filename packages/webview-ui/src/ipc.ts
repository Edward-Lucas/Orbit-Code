/**
 * Orbit Code IPC Client
 * Go 백엔드와의 통신을 담당
 */

export interface IPCMessage {
  id: string;
  type: string;
  method: string;
  payload?: any;
}

export interface IPCResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export class IPCClient {
  private baseUrl: string;
  private requestId: number = 0;

  constructor(port: number = 9090) {
    this.baseUrl = `http://localhost:${port}`;
  }

  /**
   * IPC 메시지 전송
   */
  async send(method: string, payload?: any): Promise<IPCResponse> {
    const id = this.generateId();
    const message: IPCMessage = {
      id,
      type: 'request',
      method,
      payload,
    };

    try {
      const response = await fetch(`${this.baseUrl}/ipc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`IPC error for method ${method}:`, error);
      return {
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 파일 트리 가져오기
   */
  async getFileTree(): Promise<any> {
    const response = await this.send('file.tree');
    return response.data;
  }

  /**
   * 파일 읽기
   */
  async readFile(path: string): Promise<string> {
    const response = await this.send('file.read', { path });
    return response.data?.content || '';
  }

  /**
   * 파일 쓰기
   */
  async writeFile(path: string, content: string): Promise<boolean> {
    const response = await this.send('file.write', { path, content });
    return response.success;
  }

  /**
   * 프로젝트 경로 가져오기
   */
  async getProjectPath(): Promise<string> {
    const response = await this.send('project.path');
    return response.data?.path || '';
  }

  /**
   * AI 채팅
   */
  async aiChat(message: string, context?: string): Promise<string> {
    const response = await this.send('ai.chat', { message, context });
    return response.data?.response || '';
  }

  /**
   * AI 모델 목록
   */
  async getAIModels(): Promise<any[]> {
    const response = await this.send('ai.models');
    return response.data || [];
  }

  /**
   * AI 상태 확인
   */
  async getAIStatus(): Promise<any> {
    const response = await this.send('ai.status');
    return response.data || {};
  }

  /**
   * 헬스 체크
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    this.requestId++;
    return `msg-${Date.now()}-${this.requestId}`;
  }
}

// 기본 IPC 클라이언트 인스턴스
export const ipc = new IPCClient();
