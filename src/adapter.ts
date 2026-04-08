/**
 * Schema adapter interface — abstracts over schema libraries (TypeBox, Zod, Valibot, etc.).
 * Each adapter converts its native schema format to JSON Schema for OpenAPI,
 * and provides runtime validation.
 */
export interface SchemaAdapter<TSchema = unknown> {
	/** Convert a provider-specific schema to JSON Schema (for OpenAPI spec generation). */
	toJsonSchema(schema: TSchema, schemas: Map<string, Record<string, unknown>>): Record<string, unknown>;
	/** Validate data against a schema. Returns normalized/decoded value on success. */
	validate(schema: TSchema, data: unknown): ValidationResult;
	/** Coerce string values to match expected schema types (e.g. "1" → 1 for numbers). */
	coerce?(schema: TSchema, data: unknown): unknown;
}

export interface ValidationSuccess {
	ok: true;
	value: unknown;
}

export interface ValidationFailure {
	ok: false;
	errors: { path: string; message: string; }[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;
