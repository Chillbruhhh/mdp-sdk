// ============================================
// HTTP Client - Core fetch wrapper
// ============================================

import {
  SDKConfig,
  SDKError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "./types.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
}

export class HttpClient {
  private baseUrl: string;
  private token?: string;
  private fetchFn: typeof fetch;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: SDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.token = config.token;
    this.fetchFn = config.fetch ?? globalThis.fetch;
    this.timeout = config.timeout ?? 30000;
    this.defaultHeaders = config.headers ?? {};
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");
    
    if (!response.ok) {
      let errorMessage = response.statusText;
      let errorBody: unknown;
      
      if (isJson) {
        try {
          errorBody = await response.json();
          errorMessage = (errorBody as { error?: string })?.error ?? errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
      }

      switch (response.status) {
        case 401:
          throw new AuthenticationError(errorMessage);
        case 403:
          throw new AuthorizationError(errorMessage);
        case 404:
          throw new NotFoundError(errorMessage);
        case 400:
          throw new ValidationError(errorMessage);
        default:
          throw new SDKError(errorMessage, response.status, errorBody);
      }
    }

    if (isJson) {
      return response.json() as Promise<T>;
    }
    
    return response.text() as unknown as T;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, params } = options;
    
    const url = this.buildUrl(path, params);
    
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    };

    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (this.token) {
      requestHeaders["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: "include", // Include cookies for web environments
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new SDKError("Request timeout", 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Convenience methods
  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
