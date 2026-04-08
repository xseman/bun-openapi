import type { SchemaAdapter } from "./adapter.js";
import {
	CONTROLLER_SECURITY,
	CONTROLLER_TAGS,
	getMethodsMetadata,
	getRoutePrefix,
	type MethodMetadata,
	type RouteParamEntry,
} from "./metadata.js";
import type {
	OpenAPIComponents,
	OpenAPIConfig,
	OpenAPIDocument,
	OpenAPIOperation,
	OpenAPIParameter,
	OpenAPIRequestBody,
	OpenAPIResponse,
	OpenAPITag,
} from "./types.js";

/**
 * Build an OpenAPI 3.0.3 document from controller metadata.
 */
export function buildSpec(
	controllers: (new(...args: any[]) => any)[],
	adapter: SchemaAdapter,
	config?: OpenAPIConfig,
): OpenAPIDocument {
	const schemas = new Map<string, Record<string, unknown>>();
	const paths: Record<string, Record<string, OpenAPIOperation>> = {};
	const allTags = new Set<string>();

	for (const ctor of controllers) {
		const prefix = getRoutePrefix(ctor);
		const methods = getMethodsMetadata(ctor);
		const controllerTags: string[] = Reflect.getOwnMetadata(CONTROLLER_TAGS, ctor) ?? [];
		const controllerSecurity: Record<string, string[]>[] | undefined = Reflect.getOwnMetadata(CONTROLLER_SECURITY, ctor);

		for (const method of methods) {
			if (method.hidden || method.render) continue;

			const fullPath = normalizePath(prefix, method.path);
			const openApiPath = bunPathToOpenApi(fullPath);
			const verb = method.verb.toLowerCase();

			const operation = buildOperation(ctor, method, controllerTags, controllerSecurity, schemas, adapter);

			// Collect tags
			for (const tag of operation.tags ?? []) {
				allTags.add(tag);
			}

			paths[openApiPath] ??= {};
			paths[openApiPath][verb] = operation;
		}
	}

	const components: OpenAPIComponents = {};
	if (schemas.size > 0) {
		components.schemas = Object.fromEntries(schemas);
	}
	if (config?.securitySchemes) {
		components.securitySchemes = config.securitySchemes;
	}

	const doc: OpenAPIDocument = {
		openapi: "3.0.3",
		info: {
			title: config?.service.name ?? "API",
			version: config?.service.version ?? "0.0.0",
			...(config?.service.description ? { description: config.service.description } : {}),
		},
		paths,
		...(Object.keys(components).length > 0 ? { components } : {}),
		...(allTags.size > 0 ? { tags: [...allTags].map((name): OpenAPITag => ({ name })) } : {}),
	};

	return doc;
}

function primitiveSchemaFromType(type: unknown): Record<string, unknown> {
	if (type === Number) return { type: "number" };
	if (type === Boolean) return { type: "boolean" };
	if (type === Date) return { type: "string", format: "date-time" };
	return { type: "string" };
}

function scalarRouteParamsToParameters(routeParams: RouteParamEntry[], parameterTypes: unknown[]): OpenAPIParameter[] {
	return routeParams.flatMap((routeParam): OpenAPIParameter[] => {
		if (routeParam.mode !== "scalar") return [];
		if (routeParam.source !== "param" && routeParam.source !== "query" && routeParam.source !== "header") return [];

		const location = routeParam.source === "param" ? "path" : routeParam.source;
		return [{
			name: routeParam.key!,
			in: location,
			required: location === "path" ? true : undefined,
			schema: primitiveSchemaFromType(parameterTypes[routeParam.index]),
		}];
	});
}

function buildOperation(
	ctor: new(...args: any[]) => any,
	method: MethodMetadata,
	controllerTags: string[],
	controllerSecurity: Record<string, string[]>[] | undefined,
	schemas: Map<string, Record<string, unknown>>,
	adapter: SchemaAdapter,
): OpenAPIOperation {
	const operation: OpenAPIOperation = {
		responses: {},
	};

	// Tags: method-level overrides controller-level
	const tags = method.tags ?? (controllerTags.length > 0 ? controllerTags : undefined);
	if (tags) operation.tags = tags;

	if (method.operationId) operation.operationId = method.operationId;
	if (method.summary) operation.summary = method.summary;
	if (method.description) operation.description = method.description;
	if (method.deprecated) operation.deprecated = true;

	// Security: method-level overrides controller-level
	const security = method.security ?? controllerSecurity;
	if (security) operation.security = security;

	// Parameters
	const parameters: OpenAPIParameter[] = [];
	const parameterTypes: unknown[] = Reflect.getOwnMetadata("design:paramtypes", ctor.prototype, method.propertyKey) ?? [];
	if (method.params) {
		parameters.push(...schemaToParameters(method.params, "path", schemas, adapter));
	}
	if (method.query) {
		parameters.push(...schemaToParameters(method.query, "query", schemas, adapter));
	}
	if (method.headers) {
		parameters.push(...schemaToParameters(method.headers, "header", schemas, adapter));
	}
	parameters.push(...scalarRouteParamsToParameters(method.routeParams, parameterTypes));
	if (parameters.length > 0) operation.parameters = parameters;

	// Request body
	if (method.body) {
		const contentType = method.body.contentType;
		const bodySchema = adapter.toJsonSchema(method.body.schema, schemas);
		const requestBody: OpenAPIRequestBody = {
			required: true,
			content: {
				[contentType]: { schema: bodySchema },
			},
		};
		operation.requestBody = requestBody;
	}

	// Responses
	if (method.responses.size > 0) {
		for (const [code, res] of method.responses) {
			const response: OpenAPIResponse = {
				description: res.description ?? "",
			};
			if (res.schema) {
				const contentType = method.produces ?? "application/json";
				response.content = {
					[contentType]: {
						schema: adapter.toJsonSchema(res.schema, schemas),
					},
				};
			}
			operation.responses[String(code)] = response;
		}
	} else {
		operation.responses["200"] = { description: "Success" };
	}

	return operation;
}

/**
 * Convert a schema into an array of OpenAPI parameters.
 * Delegates to the adapter's toJsonSchema, then decomposes the object properties.
 */
function schemaToParameters(
	schema: unknown,
	location: "path" | "query" | "header",
	schemas: Map<string, Record<string, unknown>>,
	adapter: SchemaAdapter,
): OpenAPIParameter[] {
	const params: OpenAPIParameter[] = [];
	const rootSchema = adapter.toJsonSchema(schema, schemas);
	const jsonSchema = resolveSchemaObject(rootSchema, schemas);
	const rootRef = typeof rootSchema.$ref === "string" ? rootSchema.$ref : undefined;

	// Only object schemas can be decomposed into individual parameters
	if (jsonSchema.type !== "object" || !jsonSchema.properties) {
		return params;
	}

	const required = new Set<string>((jsonSchema.required as string[]) ?? []);
	const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

	for (const [name, propSchema] of Object.entries(properties)) {
		const param: OpenAPIParameter = {
			name,
			in: location,
			schema: parameterPropertySchema(rootRef, name, propSchema),
		};

		if (location === "path") {
			// Path params are always required
			param.required = true;
		} else if (required.has(name)) {
			param.required = true;
		}

		if (propSchema.description) {
			param.description = propSchema.description as string;
		}

		params.push(param);
	}

	return params;
}

function parameterPropertySchema(
	rootRef: string | undefined,
	propertyName: string,
	fallbackSchema: Record<string, unknown>,
): Record<string, unknown> {
	if (!rootRef) {
		return fallbackSchema;
	}

	return {
		$ref: `${rootRef}/properties/${escapeJsonPointer(propertyName)}`,
	};
}

function escapeJsonPointer(value: string): string {
	return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function resolveSchemaObject(
	schema: Record<string, unknown>,
	components: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
	const ref = schema.$ref;
	if (typeof ref !== "string") {
		return schema;
	}

	const match = ref.match(/^#\/components\/schemas\/(.+)$/);
	if (!match) {
		return schema;
	}

	return components.get(match[1]) ?? schema;
}

/**
 * Normalize and join a controller prefix with a method path.
 */
function normalizePath(prefix: string, methodPath?: string): string {
	const p = prefix === "/" ? "" : (prefix.endsWith("/") ? prefix.slice(0, -1) : prefix);
	if (!methodPath || methodPath === "/") return p || "/";
	const m = methodPath.startsWith("/") ? methodPath : "/" + methodPath;
	return p + (m.length > 1 && m.endsWith("/") ? m.slice(0, -1) : m);
}

/**
 * Convert Bun-style path params (:id) to OpenAPI-style ({id}).
 */
function bunPathToOpenApi(path: string): string {
	return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}
