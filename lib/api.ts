export type ApiError = {
  error: string;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected server error.";
}
