import type { TSchema } from "@sinclair/typebox";
import { FormatRegistry } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type {
	SchemaAdapter,
	ValidationResult,
} from "../adapter.js";

// Register common JSON Schema string formats that TypeBox does not include by default
if (!FormatRegistry.Has("email")) {
	FormatRegistry.Set("email", (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}
if (!FormatRegistry.Has("date-time")) {
	FormatRegistry.Set("date-time", (value) => !isNaN(Date.parse(value)));
}
if (!FormatRegistry.Has("date")) {
	FormatRegistry.Set("date", (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)));
}
if (!FormatRegistry.Has("uri")) {
	FormatRegistry.Set("uri", (value) => {
		try {
			new URL(value);
			return true;
		} catch {
			return false;
		}
	});
}

/**
 * Convert a TypeBox schema to OpenAPI-compatible JSON Schema.
 * Handles named schemas ($id) by registering in components/schemas and returning $ref.
 */
function toJsonSchema(
	schema: TSchema,
	schemas: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
	// Named schema → register in components and return $ref
	if (schema.$id) {
		const name = schema.$id;
		if (!schemas.has(name)) {
			// Register first to avoid infinite recursion for circular references
			schemas.set(name, {});
			schemas.set(name, cleanSchema(schema, schemas));
		}
		return { $ref: `#/components/schemas/${name}` };
	}

	return cleanSchema(schema, schemas);
}

/**
 * Strip TypeBox-internal keys from a schema, producing clean OpenAPI JSON Schema.
 */
function cleanSchema(
	schema: TSchema,
	schemas: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(schema)) {
		// Skip TypeBox internal symbols and metadata
		if (key === Symbol.for("TypeBox.Kind") as unknown) continue;
		if (key.startsWith("[")) continue;
		if (key === "$id") continue;

		if (key === "properties" && typeof value === "object" && value !== null) {
			const props: Record<string, unknown> = {};
			for (const [propName, propSchema] of Object.entries<TSchema>(value as Record<string, TSchema>)) {
				props[propName] = toJsonSchema(propSchema, schemas);
			}
			result.properties = props;
		} else if (key === "items" && typeof value === "object" && value !== null) {
			if (Array.isArray(value)) {
				result.items = value.map((item) => toJsonSchema(item, schemas));
			} else {
				result.items = toJsonSchema(value as TSchema, schemas);
			}
		} else if (key === "anyOf" || key === "oneOf" || key === "allOf") {
			result[key] = (value as TSchema[]).map((s) => toJsonSchema(s, schemas));
		} else if (key === "not" && typeof value === "object" && value !== null) {
			result.not = toJsonSchema(value as TSchema, schemas);
		} else if (key === "additionalProperties" && typeof value === "object" && value !== null) {
			result.additionalProperties = toJsonSchema(value as TSchema, schemas);
		} else {
			result[key] = value;
		}
	}

	// Handle TypeBox's Kind-based types
	const kind = (schema as any)[Symbol.for("TypeBox.Kind")];
	if (kind) {
		if (kind === "Union" && !result.anyOf) {
			// Check for nullable pattern: Union of [Type, Null]
			const anyOf = schema.anyOf as TSchema[] | undefined;
			if (anyOf) {
				const nullIndex = anyOf.findIndex((s: TSchema) => s.type === "null");
				if (nullIndex !== -1 && anyOf.length === 2) {
					// OpenAPI 3.0 nullable pattern
					const nonNull = anyOf[1 - nullIndex];
					const converted = toJsonSchema(nonNull, schemas);
					return { ...converted, nullable: true };
				}
			}
		}
	}

	return result;
}

/**
 * Create a TypeBox schema adapter.
 *
 * @example
 * ```ts
 * import { typebox } from "bun-openapi/adapters/typebox";
 * const app = createApp({ schema: typebox(), controllers: [...] });
 * ```
 */
export function typebox(): SchemaAdapter<TSchema> {
	return {
		toJsonSchema(schema: TSchema, schemas: Map<string, Record<string, unknown>>): Record<string, unknown> {
			return toJsonSchema(schema, schemas);
		},
		validate(schema: TSchema, data: unknown): ValidationResult {
			const errors = [...Value.Errors(schema, data)];
			if (errors.length > 0) {
				return {
					ok: false,
					errors: errors.map((e) => ({
						path: e.path,
						message: e.message,
					})),
				};
			}
			return { ok: true, value: Value.Decode(schema, data) };
		},
		coerce(schema: TSchema, data: unknown): unknown {
			return Value.Convert(schema, data);
		},
	};
}
