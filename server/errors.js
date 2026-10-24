// Errors carry an HTTP status; the API responds with { detail } like FastAPI did
export class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}
