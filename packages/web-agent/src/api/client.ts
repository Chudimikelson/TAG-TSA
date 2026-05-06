const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem('agent_token');
}

export function saveToken(token: string): void {
  localStorage.setItem('agent_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('agent_token');
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    let details: Record<string, string[] | undefined> | undefined;
    try {
      const body = await res.json();
      if (typeof body?.error === 'string') message = body.error;
      if (body?.details && typeof body.details === 'object') {
        details = body.details as Record<string, string[] | undefined>;
      }
    } catch {
      // ignore parse failure
    }
    throw new ApiError(res.status, message, details);
  }
  return res.json() as Promise<T>;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return handleResponse<T>(res);
}

export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });
  return handleResponse<T>(res);
}
