export interface DocumentSuggestion {
  type: string;
  title: string;
  outline: string[];
}

export interface AnalysisResponse {
  suggestions: DocumentSuggestion[];
  error?: string;
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

export interface ApiError {
  error: string;
} 