export interface DocumentSuggestion {
  type: string;
  title: string;
  outline: string[];
}

export interface AnalysisResponse {
  suggestions: DocumentSuggestion[];
}

export interface TranscriptionResponse {
  text: string;
  success: boolean;
  error?: string;
}

export interface DocumentGenerationResponse {
  document: string;
  success: boolean;
  error?: string;
}

// 시스템 프롬프트 관리를 위한 타입들
export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'analyze' | 'generate';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemPromptsResponse {
  prompts: SystemPrompt[];
  success: boolean;
  error?: string;
}

export interface UpdatePromptRequest {
  id: string;
  prompt: string;
  isActive?: boolean;
}

export interface UpdatePromptResponse {
  success: boolean;
  error?: string;
}

export interface ApiError {
  error: string;
} 