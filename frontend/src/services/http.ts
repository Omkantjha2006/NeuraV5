import { appEnv } from '@/config/env';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!appEnv.apiUrl) {
    throw new ApiError('API URL is not configured.', 0, 'API_NOT_CONFIGURED');
  }

  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers = new Headers(init.headers);
  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${appEnv.apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Request failed.',
      response.status,
      payload?.error?.code,
    );
  }

  return payload as T;
}
