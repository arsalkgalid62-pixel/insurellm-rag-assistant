export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  streaming?: boolean;
  sources?: SourceChunk[];
  pipeline?: PipelineData;
  confidence?: number;
  confidence_label?: string;
  follow_ups?: string[];
  debug?: DebugData;
}

export interface SourceChunk {
  id: string;
  filename: string;
  doc_type: string;
  chunk_index: number;
  relevance_score: number;
  excerpt: string;
  highlighted_html: string;
}

export interface PipelineData {
  stages: { key: string; label: string; icon: string }[];
  timeline: { name: string; status: string; ms: number; detail?: string }[];
  rewritten_query: string;
  chunks_retrieved: number;
  chunks_used: number;
  latency_ms: number;
  tokens_used: number;
  model: string;
}

export interface DebugData {
  prompt_system: string;
  prompt_messages: { role: string; content: string }[];
  raw_chunk_count: number;
  reranked_scores: number[];
}

export type NavPage = "chat" | "knowledge" | "analytics" | "settings";
