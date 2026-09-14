export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type AppError = {
  code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "LIMIT_EXCEEDED" | "SUSPENDED" | "TECHNICAL";
  message: string;
  details?: Record<string, string[]>;
};
