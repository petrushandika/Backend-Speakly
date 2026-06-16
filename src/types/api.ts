export interface ApiSuccess<T> {
  data: T;
  meta?: { requestId?: string };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
