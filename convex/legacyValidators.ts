import { v } from "convex/values";

/**
 * Permissive types for existing rows with inconsistent shapes.
 * Includes boolean so flags like reviewed / emailSent still validate.
 */
export const legacyScalar = v.union(
  v.string(),
  v.float64(),
  v.boolean(),
  v.null(),
);

export const legacyOptional = v.optional(legacyScalar);
