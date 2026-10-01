export class ApiError extends Error {
  status: number;
  code: string;
  timestamp?: string;

  constructor(status: number, code: string, message: string, timestamp?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.timestamp = timestamp;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
