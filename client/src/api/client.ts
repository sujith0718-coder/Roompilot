import { ApiSuccess, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiClientError extends Error {
  public code: string;
  public details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('roomwise_auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorData = (data as ApiError).error || {
      code: 'HTTP_ERROR',
      message: response.statusText || 'API Request Failed',
    };
    throw new ApiClientError(errorData.code, errorData.message, errorData.details);
  }

  return (data as ApiSuccess<T>).data;
}

export const api = {
  getHealth: () => request<{ status: string; dbStatus: string; uptime: number }>('/health'),
};
