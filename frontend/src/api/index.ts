import axios from 'axios';
import type {
  User,
  TokenResponse,
  DataSource,
  TableInfo,
  TextToSQLRequest,
  TextToSQLResponse,
  QueryHistory,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
  CreateDataSourceRequest,
  UpdateDataSourceRequest,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const url = config.url || '';
  if (token && !url.includes('/auth/login') && !url.includes('/auth/register')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post('/auth/login', new URLSearchParams(data as unknown as Record<string, string>), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const userAPI = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export const dataSourceAPI = {
  getAll: async (): Promise<DataSource[]> => {
    const response = await api.get('/data-sources');
    return response.data;
  },

  getById: async (id: string): Promise<DataSource> => {
    const response = await api.get(`/data-sources/${id}`);
    return response.data;
  },

  create: async (data: CreateDataSourceRequest): Promise<DataSource> => {
    const response = await api.post('/data-sources', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDataSourceRequest): Promise<DataSource> => {
    const response = await api.put(`/data-sources/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/data-sources/${id}`);
    return response.data;
  },

  getTables: async (id: string): Promise<TableInfo[]> => {
    const response = await api.get(`/data-sources/${id}/tables`);
    return response.data;
  },

  selectTables: async (id: string, tables: string[]): Promise<{ message: string }> => {
    const response = await api.post(`/data-sources/${id}/tables`, tables);
    return response.data;
  },

  getSelectedTables: async (id: string): Promise<TableInfo[]> => {
    const response = await api.get(`/data-sources/${id}/selected-tables`);
    return response.data;
  },
};

export const textToSQLAPI = {
  query: async (data: TextToSQLRequest): Promise<TextToSQLResponse> => {
    const response = await api.post('/text-to-sql/query', data);
    return response.data;
  },

  getHistory: async (dataSourceId?: string): Promise<QueryHistory[]> => {
    const params = dataSourceId ? { data_source_id: dataSourceId } : {};
    const response = await api.get('/text-to-sql/history', { params });
    return response.data;
  },

  getHistoryById: async (id: string): Promise<QueryHistory> => {
    const response = await api.get(`/text-to-sql/history/${id}`);
    return response.data;
  },

  deleteHistory: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/text-to-sql/history/${id}`);
    return response.data;
  },

  getStats: async (): Promise<{ total_queries: number; success_count: number }> => {
    const response = await api.get('/text-to-sql/history/stats');
    return response.data;
  },
};

export default api;