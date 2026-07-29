export function formatErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export function toError(error: unknown, fallback = "Something went wrong") {
  return new Error(formatErrorMessage(error, fallback));
}
