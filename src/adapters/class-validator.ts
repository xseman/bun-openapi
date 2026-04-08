import { plainToInstance } from "class-transformer";
import {
	validateSync,
	type ValidationError,
} from "class-validator";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";

import type {
	SchemaAdapter,
	ValidationFailure,
	ValidationResult,
} from "../adapter.js";

type ClassValidatorSchema = new(...args: any[]) => object;
type ClassValidatorArraySchema = [ClassValidatorSchema];

function isClassSchema(schema: unknown): schema is ClassValidatorSchema {
	return typeof schema === "function";
}

function isArraySchema(schema: unknown): schema is ClassValidatorArraySchema {
	return Array.isArray(schema) && schema.length === 1 && isClassSchema(schema[0]);
}

function normalizeJsonSchema(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeJsonSchema(item));
	}

	if (value && typeof value === "object") {
		const normalized: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			if (key === "$schema") continue;
			if (key === "$ref" && typeof entry === "string") {
				normalized[key] = entry.replace("#/definitions/", "#/components/schemas/");
				continue;
			}
			normalized[key] = normalizeJsonSchema(entry);
		}
		return normalized;
	}

	return value;
}

function flattenValidationErrors(
	errors: ValidationError[],
	prefix: string = "",
): ValidationFailure["errors"] {
	const failures: ValidationFailure["errors"] = [];

	for (const error of errors) {
		const path = `${prefix}/${error.property}`;
		for (const message of Object.values(error.constraints ?? {})) {
			failures.push({ path, message });
		}
		if (error.children?.length) {
			failures.push(...flattenValidationErrors(error.children, path));
		}
	}

	return failures;
}

function validateClassSchema(
	schema: ClassValidatorSchema,
	data: unknown,
): ValidationResult {
	const instance = plainToInstance(schema, data, {
		enableImplicitConversion: true,
	});
	const errors = validateSync(instance, {
		forbidUnknownValues: false,
	});

	if (errors.length > 0) {
		return {
			ok: false,
			errors: flattenValidationErrors(errors),
		};
	}

	return { ok: true, value: instance };
}

function validateArraySchema(
	schema: ClassValidatorArraySchema,
	data: unknown,
): ValidationResult {
	if (!Array.isArray(data)) {
		return {
			ok: false,
			errors: [{ path: "/", message: "Expected an array" }],
		};
	}

	const values: unknown[] = [];
	const failures: ValidationFailure["errors"] = [];

	for (const [index, item] of data.entries()) {
		const result = validateClassSchema(schema[0], item);
		if (!result.ok) {
			failures.push(
				...result.errors.map((error) => ({
					path: `/${index}${error.path}`,
					message: error.message,
				})),
			);
			continue;
		}
		values.push(result.value);
	}

	if (failures.length > 0) {
		return { ok: false, errors: failures };
	}

	return { ok: true, value: values };
}

function registerSchemas(schemas: Map<string, Record<string, unknown>>): void {
	const generated = validationMetadatasToSchemas();
	for (const [name, schema] of Object.entries(generated)) {
		if (!schemas.has(name)) {
			schemas.set(name, normalizeJsonSchema(schema) as Record<string, unknown>);
		}
	}
}

/**
 * Create a class-validator schema adapter.
 * Requires `class-transformer`, `class-validator`, and `class-validator-jsonschema`.
 */
export function classValidator(): SchemaAdapter<ClassValidatorSchema | ClassValidatorArraySchema> {
	return {
		toJsonSchema(
			schema: ClassValidatorSchema | ClassValidatorArraySchema,
			schemas: Map<string, Record<string, unknown>>,
		): Record<string, unknown> {
			if (isArraySchema(schema)) {
				return {
					type: "array",
					items: this.toJsonSchema(schema[0], schemas),
				};
			}

			if (!isClassSchema(schema)) {
				return normalizeJsonSchema(schema) as Record<string, unknown>;
			}

			registerSchemas(schemas);
			const name = schema.name;
			if (schemas.has(name)) {
				return { $ref: `#/components/schemas/${name}` };
			}

			return normalizeJsonSchema(validationMetadatasToSchemas()[name] ?? {}) as Record<string, unknown>;
		},
		validate(schema: ClassValidatorSchema | ClassValidatorArraySchema, data: unknown): ValidationResult {
			if (isArraySchema(schema)) {
				return validateArraySchema(schema, data);
			}

			if (!isClassSchema(schema)) {
				return { ok: true, value: data };
			}

			return validateClassSchema(schema, data);
		},
	};
}
