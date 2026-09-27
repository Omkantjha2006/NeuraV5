export type AgentId = string;

export interface Agent {
  id: AgentId;
  name: string;
  shortName: string;
  description: string;
  capabilities: string[];
  color: string;
  gradient: string;
  icon: string;
  isActive?: boolean;
  provider?: string;
  model?: string;
}

export interface WebSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score?: number | null;
  publishedAt?: string | null;
  domain?: string;
}

export interface MessageMetadata {
  webResearch?: boolean;
  webSources?: WebSource[];
  ragSources?: Array<{
    documentId: string;
    documentName: string;
    chunkIndex: number;
    page: number | null;
    score: number;
  }>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  agentId?: AgentId;
  liked?: boolean | null;
  feedback?: 'positive' | 'negative' | null;
  isError?: boolean;
  isStreaming?: boolean;
  metadata?: MessageMetadata | null;
}

export interface Conversation {
  id: string;
  title: string;
  agentId: AgentId;
  messages: Message[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ConversationGroup = 'Pinned' | 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

export interface Memory {
  id: string;
  content: string;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  defaultAgentId: string;
  theme: string;
  language: string;
  customInstructions?: string | null;
  streamingResponses: boolean;
  verboseResponses: boolean;
  autoSuggestFollowups: boolean;
  saveConversationHistory: boolean;
  emailNotifications: boolean;
  conversationResponses: boolean;
  documentProcessingNotifications: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  allowDataTraining: boolean;
  activityTracking: boolean;
  codeSyntaxHighlighting: boolean;
  fontSize: string;
}


export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  createdAt?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'image';
  size: string;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'error';
  agentId: AgentId;
  pages?: number;
}

export type Route =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'chat'
  | 'dashboard'
  | 'documents'
  | 'settings'
  | 'profile'
  | 'study'
  | 'developer'
  | 'productivity'
  | 'analytics';


export interface ProductivityTask {
  id: string; title: string; description?: string | null; status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high'; dueAt?: string | null; completedAt?: string | null;
  createdAt: string; updatedAt: string;
}
export interface SavedPrompt { id: string; title: string; prompt: string; category?: string | null; createdAt: string; updatedAt: string; }
export interface WorkspaceNote { id: string; title: string; content: string; createdAt: string; updatedAt: string; }
