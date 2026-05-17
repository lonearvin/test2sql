export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  role: string;
}

export interface DataSource {
  id: string;
  user_id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableInfo {
  table_name: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TextToSQLRequest {
  data_source_id: string;
  question: string;
  conversation_history?: ConversationMessage[];
}

export interface TextToSQLResponse {
  id: string | null;
  sql: string | null;
  results: Record<string, unknown>[];
  status: string;
  error_message: string | null;
  conversation_history?: ConversationMessage[];
}

export interface QueryHistory {
  id: string;
  data_source_id: string;
  question: string;
  sql: string | null;
  results: Record<string, unknown>[];
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  role?: string;
}

export interface CreateDataSourceRequest {
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  description?: string;
}

export interface UpdateDataSourceRequest {
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  description?: string;
}