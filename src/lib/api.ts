
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';

// =====================================================
// API CONFIGURATION
// =====================================================

const configuredNative =
  process.env.EXPO_PUBLIC_API_URL ||
  String(Constants.expoConfig?.extra?.apiUrl || '');

const configuredWeb =
  process.env.EXPO_PUBLIC_API_URL_WEB ||
  'http://localhost:5000/api';

const configured =
  Platform.OS === 'web'
    ? configuredWeb
    : configuredNative;

export const API_BASE_URL = configured.trim().replace(/\/+$/, '');
const API_ROOT_URL = /\/api$/i.test(API_BASE_URL)
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;
let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(
  provider: (() => Promise<string | null>) | null,
) {
  authTokenProvider = provider;
}

// =====================================================
// API ERROR
// =====================================================

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// =====================================================
// FORMDATA DETECTION
// =====================================================

function isFormDataBody(body: unknown): body is FormData {
  return (
    typeof FormData !== 'undefined' &&
    body instanceof FormData
  );
}

// =====================================================
// BODY PREPARATION
// =====================================================

function prepareBody(body?: unknown): BodyInit | undefined {
  if (body == null) {
    return undefined;
  }

  // Preserve FormData. Never JSON.stringify multipart data.
  if (isFormDataBody(body)) {
    return body;
  }

  return JSON.stringify(body);
}

// =====================================================
// API RESPONSE DECODER
// =====================================================

type ApiEnvelope = {
  success?: boolean;
  message?: string;
  data?: unknown;
  error?: {
    message?: string;
    code?: string;
  };
};

async function decode<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  let body: ApiEnvelope = {};

  if (responseText) {
    try {
      body = JSON.parse(responseText) as ApiEnvelope;
    } catch {
      const isHtml =
        /^\s*<!doctype html/i.test(responseText) ||
        /^\s*<html[\s>]/i.test(responseText);
      body = isHtml
        ? {
            message: `Unexpected server response (${response.status}). Check that the API URL points to the backend /api endpoint.`,
          }
        : { message: responseText };
    }
  }

  if (!response.ok || body.success === false) {
    throw new ApiError(
      body.error?.message ||
        body.message ||
        `Request failed (${response.status})`,
      response.status,
      body.error?.code
    );
  }

  // Backend response:
  // { success: true, message: "...", data: {...} }

  if (
    body &&
    Object.prototype.hasOwnProperty.call(body, 'data')
  ) {
    return body.data as T;
  }

  return body as T;
}

// =====================================================
// MAIN API REQUEST HANDLER
// =====================================================

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'API URL is missing. Configure EXPO_PUBLIC_API_URL in your .env file.',
      0,
      'API_URL_MISSING'
    );
  }

  const headers = new Headers(options.headers || {});

  const isMultipart = isFormDataBody(options.body);

  // IMPORTANT:
  // Do not manually set Content-Type for FormData.
  // Expo Fetch must generate the multipart boundary.
  if (isMultipart) {
    headers.delete('Content-Type');
  } else if (
    options.body != null &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  const activeToken = authTokenProvider
    ? await authTokenProvider()
    : token;
  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  } else {
    headers.delete('Authorization');
  }

  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  const endpoint = `${API_ROOT_URL}${normalizedPath}`;

  let response: Response;

  try {
    response = await expoFetch(endpoint, {
      ...options,
      headers,
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : String(error);

    console.error('[MediConnect API] Network request failed:', {
      endpoint,
      method: options.method || 'GET',
      multipart: isMultipart,
      error: detail,
    });

    throw new ApiError(
      `Cannot reach the MediConnect server at ${API_BASE_URL}. ${detail}`,
      0,
      'NETWORK_ERROR'
    );
  }

  return decode<T>(response);
}

// =====================================================
// CONVENIENT API METHODS
// =====================================================

export const api = {
  // GET
  get: <T>(
    path: string,
    token?: string | null
  ) =>
    apiRequest<T>(
      path,
      {
        method: 'GET',
      },
      token
    ),

  // POST - supports JSON and FormData
  post: <T>(
    path: string,
    body?: unknown,
    token?: string | null
  ) =>
    apiRequest<T>(
      path,
      {
        method: 'POST',
        body: prepareBody(body),
      },
      token
    ),

  // PATCH - supports JSON and FormData
  patch: <T>(
    path: string,
    body?: unknown,
    token?: string | null
  ) =>
    apiRequest<T>(
      path,
      {
        method: 'PATCH',
        body: prepareBody(body),
      },
      token
    ),

  // DELETE
  delete: <T>(
    path: string,
    token?: string | null,
    body?: unknown
  ) =>
    apiRequest<T>(
      path,
      {
        method: 'DELETE',
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
      token
    ),
};
