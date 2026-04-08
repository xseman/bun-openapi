import type {
	SchemaAdapter,
	ValidationResult,
} from "../adapter.js";

/**
 * Create a Valibot schema adapter.
 * Requires `valibot` and `@valibot/to-json-schema` as peer dependencies.
 *
 * @example
 * ```ts
 * import { valibot } from "bun-openapi/adapters/valibot";
 * const app = createApp({ schema: valibot(), controllers: [...] });
 * ```
 */
export function valibot(): SchemaAdapter {
	let toJsonSchema: (schema: any) => any;
	let valibotMod: any;

	try {
		toJsonSchema = require("@valibot/to-json-schema").toJsonSchema;
		valibotMod = require("valibot");
	} catch {
		throw new Error("valibot and @valibot/to-json-schema are required for the Valibot adapter. Install them: bun add valibot @valibot/to-json-schema");
	}

	return {
		toJsonSchema(schema: any, _schemas: Map<string, Record<string, unknown>>): Record<string, unknown> {
			const jsonSchema = toJsonSchema(schema) as Record<string, unknown>;
			const { $schema, ...rest } = jsonSchema;
			return rest;
		},
		validate(schema: any, data: unknown): ValidationResult {
			const result = valibotMod.safeParse(schema, data);
			if (!result.success) {
				return {
					ok: false,
					errors: result.issues.map((i: any) => ({
						path: "/" + (i.path?.map((p: any) => p.key).join("/") ?? ""),
						message: i.message,
					})),
				};
			}
			return { ok: true, value: result.output };
		},
	};
}
