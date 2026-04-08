import type {
	SchemaAdapter,
	ValidationResult,
} from "../adapter.js";

/**
 * Create a Zod schema adapter.
 * Requires `zod` and `zod-to-json-schema` as peer dependencies.
 *
 * @example
 * ```ts
 * import { zod } from "bun-openapi/adapters/zod";
 * const app = createApp({ schema: zod(), controllers: [...] });
 * ```
 */
export function zod(): SchemaAdapter {
	let zodToJsonSchema: (schema: any, opts?: any) => any;

	try {
		zodToJsonSchema = require("zod-to-json-schema").zodToJsonSchema;
	} catch {
		throw new Error("zod-to-json-schema is required for the Zod adapter. Install it: bun add zod-to-json-schema");
	}

	return {
		toJsonSchema(schema: any, schemas: Map<string, Record<string, unknown>>): Record<string, unknown> {
			const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" }) as Record<string, unknown>;

			// Handle named schemas via .openapi({ ref: "Name" })
			const ref = schema?._def?.openapi?.ref ?? schema?.description;
			if (ref && typeof ref === "string" && !schemas.has(ref)) {
				// Strip $schema from top-level
				const { $schema, ...rest } = jsonSchema;
				schemas.set(ref, rest);
				return { $ref: `#/components/schemas/${ref}` };
			}

			// Strip $schema from output
			const { $schema, ...rest } = jsonSchema;
			return rest;
		},
		validate(schema: any, data: unknown): ValidationResult {
			const result = schema.safeParse(data);
			if (!result.success) {
				return {
					ok: false,
					errors: result.error.issues.map((i: any) => ({
						path: "/" + i.path.join("/"),
						message: i.message,
					})),
				};
			}
			return { ok: true, value: result.data };
		},
	};
}
