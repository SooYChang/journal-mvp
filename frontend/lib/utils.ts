export function isSafeReturnTo(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
