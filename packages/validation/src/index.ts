import { ZodType } from 'zod';

export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error(result.error.flatten().formErrors.join('; ') || 'Validation failed');
  }

  return result.data;
}

