/**
 * Orbit Code AI Engine
 * MiMo-Code + gajae-code 통합 AI 코어
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConfig {
  provider: 'anthropic' | 'openai' | 'local';
  apiKey?: string;
  model?: string;
}

export class AIEngine {
  private config: AIConfig;
  private history: ChatMessage[] = [];

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 사용자 메시지에 응답
   */
  async chat(message: string, context?: string): Promise<string> {
    // 사용자 메시지 추가
    this.history.push({ role: 'user', content: message });

    // 프롬프트 생성
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.history,
    ];

    try {
      let response: string;

      switch (this.config.provider) {
        case 'anthropic':
          response = await this.callAnthropic(messages);
          break;
        case 'openai':
          response = await this.callOpenAI(messages);
          break;
        default:
          response = 'AI provider not configured.';
      }

      // 응답 저장
      this.history.push({ role: 'assistant', content: response });
      return response;
    } catch (error) {
      console.error('AI chat error:', error);
      throw error;
    }
  }

  /**
   * 시스템 프롬프트 생성
   */
  private buildSystemPrompt(context?: string): string {
    let prompt = `You are Orbit Code AI, an expert coding assistant integrated into the Orbit Code editor.
You help developers with:
- Writing and explaining code
- Debugging issues
- Code review and suggestions
- Architecture decisions
- Best practices

Be concise, helpful, and focus on actionable guidance.`;

    if (context) {
      prompt += `\n\nCurrent code context:\n\`\`\`\n${context}\n\`\`\``;
    }

    return prompt;
  }

  /**
   * Anthropic API 호출
   */
  private async callAnthropic(messages: ChatMessage[]): Promise<string> {
    // TODO: @anthropic-ai/sdk 통합
    // 현재는 시뮬레이션
    return `[Anthropic] Processing: ${messages[messages.length - 1].content.substring(0, 50)}...`;
  }

  /**
   * OpenAI API 호출
   */
  private async callOpenAI(messages: ChatMessage[]): Promise<string> {
    // TODO: openai SDK 통합
    // 현재는 시뮬레이션
    return `[OpenAI] Processing: ${messages[messages.length - 1].content.substring(0, 50)}...`;
  }

  /**
   * 히스토리 초기화
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 현재 히스토리 반환
   */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }
}

// 기본 AI 엔진 인스턴스
export const defaultAI = new AIEngine({
  provider: 'local',
});
