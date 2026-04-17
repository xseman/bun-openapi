import { AsyncLocalStorage } from "node:async_hooks";

import type {
	Serve,
	Server,
} from "bun";

import type { SchemaAdapter } from "./adapter.js";
import { Container } from "./container.js";
import { Controller } from "./controller.js";
import {
	BadRequestException,
	ForbiddenException,
	HttpException,
	UnauthorizedException,
} from "./exceptions.js";
import {
	type CanActivate,
	type CanActivateSecurity,
	CONTROLLER_GUARDS,
	CONTROLLER_INTERCEPTORS,
	CONTROLLER_MIDDLEWARE,
	CONTROLLER_SECURITY,
	CONTROLLER_VALIDATE_RESPONSE,
	getMethodsMetadata,
	getRoutePrefix,
	type GuardContext,
	type Interceptor,
	type InterceptorContext,
	type MethodMetadata,
	type MiddlewareFunction,
	type ProviderToken,
} from "./metadata.js";
import {
	buildAppTree,
	type ModuleTreeNode,
} from "./module-tree.js";
import { renderModuleTreeSvg } from "./module-viewer/svg.js";
import { resolveModules } from "./module.js";
import { buildSpec } from "./openapi.js";
import type {
	AppConfig,
	AppResult,
	DocsConfig,
	ErrorFormatter,
	ModuleViewerConfig,
	Provider,
	RouteHandler,
	SwaggerUIConfig,
} from "./types.js";
import { ViewEngine } from "./view-engine.js";

function getProviderToken(provider: Provider): ProviderToken {
	return typeof provider === "function" ? provider : provider.provide;
}

export interface CallerContext {
	className: string;
	methodName: string;
}

export const callerContextStorage = new AsyncLocalStorage<CallerContext>();

export function getCallerContext(): CallerContext | undefined {
	return callerContextStorage.getStore();
}

/**
 * Create a Bun.serve-compatible app from decorated controllers.
 */
export function createApp(config: AppConfig): AppResult {
	const adapter = config.schema;

	// Resolve modules and merge with direct controllers/providers
	const moduleResult = config.imports?.length
		? resolveModules(config.imports)
		: {
			controllers: [],
			providers: [],
			exportedTokens: new Set<ProviderToken>(),
			controllerVisibility: new Map<new(...args: any[]) => any, Set<ProviderToken>>(),
			providerVisibility: new Map<ProviderToken, Set<ProviderToken>>(),
		};

	const directProviders = config.providers ?? [];
	const rootVisibleTokens = new Set<ProviderToken>([
		...directProviders.map(getProviderToken),
		...moduleResult.exportedTokens,
	]);
	const allControllers = [...(config.controllers ?? []), ...moduleResult.controllers];

	const spec = buildSpec(allControllers, adapter, config.openapi);

	// Optionally write spec to disk
	if (config.openapi?.filePath) {
		const isYaml = config.openapi.filePath.endsWith(".yaml") || config.openapi.filePath.endsWith(".yml");
		const content = isYaml
			? Bun.YAML.stringify(spec, null, 2)
			: JSON.stringify(spec, null, 2);

		Bun.write(config.openapi.filePath, content);
	}

	const routes: Record<string, Partial<Record<Serve.HTTPMethod, (req: Request, server: Server<undefined>) => Response | Promise<Response>>>> = {};

	const globalGuards = config.guards ?? [];
	const globalInterceptors = config.interceptors ?? [];
	const globalMiddleware = config.middlewares ?? [];

	// Set up DI container
	const container = new Container();
	for (const provider of directProviders) {
		container.register(provider, rootVisibleTokens);
	}
	for (const provider of moduleResult.providers) {
		container.register(provider, moduleResult.providerVisibility.get(getProviderToken(provider)));
	}

	const controllerEntries = [
		...(config.controllers ?? []).map((ctor) => ({ ctor, visibility: rootVisibleTokens })),
		...moduleResult.controllers.map((ctor) => ({
			ctor,
			visibility: moduleResult.controllerVisibility.get(ctor) ?? new Set<ProviderToken>(),
		})),
	];

	const viewEngine = config.viewEngine ? new ViewEngine(config.viewEngine) : undefined;

	for (const { ctor, visibility } of controllerEntries) {
		const prefix = getRoutePrefix(ctor);
		const methods = getMethodsMetadata(ctor);
		const controllerGuards: Array<new(...args: any[]) => CanActivate> = Reflect.getOwnMetadata(CONTROLLER_GUARDS, ctor) ?? [];
		const controllerInterceptors: Array<new(...args: any[]) => Interceptor> = Reflect.getOwnMetadata(CONTROLLER_INTERCEPTORS, ctor) ?? [];
		const controllerSecurity: Record<string, string[]>[] | undefined = Reflect.getOwnMetadata(CONTROLLER_SECURITY, ctor);
		const controllerValidateResponse: boolean | undefined = Reflect.getOwnMetadata(CONTROLLER_VALIDATE_RESPONSE, ctor);
		const controllerMiddleware: MiddlewareFunction[] = Reflect.getOwnMetadata(CONTROLLER_MIDDLEWARE, ctor) ?? [];

		for (const method of methods) {
			if (method.render && !viewEngine) {
				throw new Error(
					`@Render('${method.render}') on ${ctor.name}.${method.propertyKey} requires viewEngine to be configured in createApp(). `
						+ `Add viewEngine: { viewsDir: '...' } to your createApp() config.`,
				);
			}

			const fullPath = normalizePath(prefix, method.path);
			const verb = method.verb;

			const handler = createHandler(
				ctor,
				method,
				[...globalGuards, ...controllerGuards],
				[...globalInterceptors, ...controllerInterceptors],
				[...globalMiddleware, ...controllerMiddleware],
				visibility,
				controllerSecurity,
				method.validateResponse ?? controllerValidateResponse ?? (config.validateResponse ?? false),
				adapter,
				container,
				config.errorFormatter,
				config.securityGuards,
				viewEngine,
			);

			registerRoute(routes, fullPath, verb, handler);
		}
	}

	const fetch = (_req: Request, _server: Server<undefined>): Response => {
		return new Response("Not Found", { status: 404 });
	};

	const docsLinks: Array<{ href: string; label: string; }> = [];
	const hasModuleViewerTargets = Boolean(
		config.imports?.length
			|| config.controllers?.length
			|| config.providers?.length,
	);

	// Resolve docs config
	const docsConfig: DocsConfig = config.docs === true
		? {
			swagger: true,
			modules: true,
		}
		: typeof config.docs === "object"
		? config.docs
		: {};

	// Swagger UI routes
	if (docsConfig.swagger) {
		const swaggerConfig: SwaggerUIConfig = typeof docsConfig.swagger === "object"
			? docsConfig.swagger
			: {};

		const basePath = swaggerConfig.path ?? "/docs/swagger";
		const normalized = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
		const specPath = normalized + "/openapi.json";
		docsLinks.push({ href: normalized + "/", label: "Swagger UI" });
		docsLinks.push({ href: specPath, label: "OpenAPI JSON" });

		registerRoute(routes, specPath, "GET", () => Response.json(spec));

		// Extract serializable SwaggerUIBundle options (excluding our custom `path`)
		const {
			path: _path,
			...swaggerBundleConfig
		} = swaggerConfig;

		const htmlPath = new URL("./swagger-ui/index.html", import.meta.url).pathname;
		registerRoute(routes, normalized + "/", "GET", async () => {
			const result = await Bun.build({
				entrypoints: [htmlPath],
				target: "browser",
				compile: true,
				define: {
					SPEC_URL: JSON.stringify(specPath),
					SWAGGER_CONFIG: JSON.stringify(swaggerBundleConfig),
				},
			});

			if (!result.success) {
				throw new AggregateError(result.logs, "Failed to build Swagger UI");
			}

			const swaggerUIContent = await result.outputs[0]!.text();
			return new Response(swaggerUIContent, { headers: { "content-type": "text/html; charset=utf-8" } });
		});
	}

	// Module hierarchy viewer routes
	if (docsConfig.modules && hasModuleViewerTargets) {
		const viewerConfig: ModuleViewerConfig = typeof docsConfig.modules === "object" ? docsConfig.modules : {};

		const basePath = viewerConfig.path ?? "/docs/modules";
		const normalized = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

		const treeData: ModuleTreeNode = buildAppTree({
			imports: config.imports,
			controllers: config.controllers,
			providers: config.providers,
		});
		const treeJson = JSON.stringify(treeData);
		const svgPath = viewerConfig.svgPath === false ? undefined : (viewerConfig.svgPath ?? normalized + "/tree.svg");
		docsLinks.push({ href: normalized + "/", label: "Module Viewer" });

		const jsonPath = normalized + "/tree.json";
		docsLinks.push({ href: jsonPath, label: "Module Tree JSON" });
		registerRoute(routes, jsonPath, "GET", () => Response.json(treeData));

		if (svgPath) {
			docsLinks.push({ href: svgPath, label: "Module Tree SVG" });
			registerRoute(routes, svgPath, "GET", () =>
				new Response(renderModuleTreeSvg(treeData), {
					headers: { "content-type": "image/svg+xml; charset=utf-8" },
				}));
		}

		const htmlPath = new URL("./module-viewer/index.html", import.meta.url).pathname;
		registerRoute(routes, normalized + "/", "GET", async () => {
			const result = await Bun.build({
				entrypoints: [htmlPath],
				target: "browser",
				compile: true,
				define: {
					TREE_JSON: JSON.stringify(treeJson),
				},
			});

			if (!result.success) {
				throw new AggregateError(result.logs, "Failed to build module viewer");
			}

			const content = await result.outputs[0]!.text();
			return new Response(content, { headers: { "content-type": "text/html; charset=utf-8" } });
		});
	}

	if (docsLinks.length > 0) {
		registerRoute(routes, "/docs/", "GET", () =>
			new Response(renderDocsIndex(docsLinks), {
				headers: { "content-type": "text/html; charset=utf-8" },
			}));
	}

	return {
		spec: spec,
		fetch: fetch,
		routes: routes as Record<string, RouteHandler>,
	};
}

function renderDocsIndex(links: Array<{ href: string; label: string; }>): string {
	const items = links
		.map(({ href, label }) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Documentation</title>
	<style>
		body { font-family: ui-monospace, monospace; background: #ffffff; color: #1e293b; margin: 0; }
		main { max-width: 840px; margin: 0 auto; padding: 40px 24px; }
		h1 { font-size: 24px; margin: 0 0 12px; color: #4f46e5; }
		p { margin: 0 0 20px; color: #64748b; }
		ul { margin: 0; padding-left: 20px; }
		li { margin: 10px 0; }
		a { color: #0f766e; text-decoration: none; }
		a:hover { text-decoration: underline; }
	</style>
</head>
<body>
	<main>
		<h1>Documentation</h1>
		<p>Available generated documentation endpoints.</p>
		<ul>
			${items}
		</ul>
	</main>
</body>
</html>`;
}

function registerRoute(
	routes: Record<string, Partial<Record<Serve.HTTPMethod, (req: Request, server: Server<undefined>) => Response | Promise<Response>>>>,
	path: string,
	verb: Serve.HTTPMethod,
	handler: (req: Request, server: Server<undefined>) => Response | Promise<Response>,
): void {
	routes[path] ??= {};
	routes[path][verb] = handler;

	const alias = trailingSlashAlias(path);
	if (!alias) return;

	routes[alias] ??= {};
	routes[alias][verb] = handler;
}

function trailingSlashAlias(path: string): string | undefined {
	if (path === "/") return undefined;
	if (path.endsWith("/")) {
		return path.slice(0, -1) || "/";
	}
	return path + "/";
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function requiresBody(method: MethodMetadata): boolean {
	return method.routeParams.some((routeParam) => routeParam.source === "body");
}

function coercePrimitiveValue(
	value: unknown,
	expectedType: unknown,
	required: boolean,
	label: string,
): { ok: true; value: unknown; } | { ok: false; message: string; } {
	if (value === undefined || value === null) {
		if (required) {
			return { ok: false, message: `${label} is required` };
		}
		return { ok: true, value: undefined };
	}

	if (Array.isArray(value)) {
		if (expectedType === Array) {
			return { ok: true, value };
		}
		return { ok: false, message: `${label} must be a single value` };
	}

	if (expectedType === Number) {
		const parsed = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(parsed)) {
			return { ok: false, message: `${label} must be a number` };
		}
		return { ok: true, value: parsed };
	}

	if (expectedType === Boolean) {
		if (typeof value === "boolean") {
			return { ok: true, value };
		}
		if (value === "true" || value === "1") {
			return { ok: true, value: true };
		}
		if (value === "false" || value === "0") {
			return { ok: true, value: false };
		}
		return { ok: false, message: `${label} must be a boolean` };
	}

	if (expectedType === Date) {
		const parsed = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(parsed.getTime())) {
			return { ok: false, message: `${label} must be a valid date` };
		}
		return { ok: true, value: parsed };
	}

	if (expectedType === String || expectedType == null || expectedType === Object) {
		return { ok: true, value: typeof value === "string" ? value : String(value) };
	}

	return { ok: true, value };
}

function mapError(error: unknown): { status: number; headers: Record<string, string>; body: unknown; } {
	if (error instanceof HttpException) {
		return {
			status: error.getStatus(),
			headers: error.getHeaders(),
			body: error.getBody(),
		};
	}

	if (error instanceof Error) {
		return {
			status: 500,
			headers: {},
			body: { message: error.message },
		};
	}

	return {
		status: 500,
		headers: {},
		body: { message: "Internal Server Error" },
	};
}

function responseFromPayload(status: number, body: unknown, headers: HeadersInit): Response {
	if (body === undefined || body === null) {
		return new Response(null, { status, headers });
	}

	if (
		typeof body === "string"
		|| body instanceof Blob
		|| body instanceof ArrayBuffer
		|| ArrayBuffer.isView(body)
		|| body instanceof FormData
		|| body instanceof ReadableStream
		|| body instanceof URLSearchParams
	) {
		return new Response(body as BodyInit, { status, headers });
	}

	return Response.json(body, { status, headers });
}

function formatErrorResponse(
	error: unknown,
	request: Request,
	errorFormatter?: ErrorFormatter,
): Response {
	const mapped = mapError(error);
	const context = {
		request,
		status: mapped.status,
		headers: { ...mapped.headers },
		body: mapped.body,
	};

	if (!errorFormatter) {
		return responseFromPayload(context.status, context.body, context.headers);
	}

	const formatted = errorFormatter(error, context);
	if (formatted instanceof Response) {
		return formatted;
	}

	const body = Object.prototype.hasOwnProperty.call(formatted, "body") ? formatted.body : context.body;
	return responseFromPayload(formatted.status ?? context.status, body, formatted.headers ?? context.headers);
}

function validateResponseBody(
	method: MethodMetadata,
	status: number,
	body: unknown,
	adapter: SchemaAdapter,
): unknown {
	const response = method.responses.get(status);
	if (!response?.schema) {
		return body;
	}

	const result = adapter.validate(response.schema, body);
	if (!result.ok) {
		throw new HttpException(500, {
			message: "Response validation failed",
			status,
			errors: result.errors,
		});
	}

	return result.value;
}

async function evaluateGuardResult(
	result: boolean | Response | void,
	deniedError: HttpException,
): Promise<Response | undefined> {
	if (result instanceof Response) {
		return result;
	}

	if (result === false) {
		throw deniedError;
	}

	return undefined;
}

async function runGuards(
	guards: Array<new(...args: any[]) => CanActivate>,
	context: GuardContext,
	requestScope: ReturnType<Container["createRequestScope"]>,
	visibleTokens: Set<ProviderToken>,
): Promise<Response | undefined> {
	for (const Guard of guards) {
		const guard = requestScope.instantiate(Guard, visibleTokens) as CanActivate;
		const response = await evaluateGuardResult(await guard.canActivate(context), new ForbiddenException());
		if (response) {
			return response;
		}
	}

	return undefined;
}

async function runSecurityGuards(
	security: Record<string, string[]>[] | undefined,
	securityGuards: Record<string, new(...args: any[]) => CanActivateSecurity> | undefined,
	context: GuardContext,
	requestScope: ReturnType<Container["createRequestScope"]>,
	visibleTokens: Set<ProviderToken>,
): Promise<Response | undefined> {
	if (!security?.length || !securityGuards) {
		return undefined;
	}

	let attempted = false;

	for (const requirement of security) {
		let satisfied = true;

		for (const [scheme, scopes] of Object.entries(requirement)) {
			const Guard = securityGuards[scheme];
			if (!Guard) {
				satisfied = false;
				break;
			}

			attempted = true;
			const guard = requestScope.instantiate(Guard, visibleTokens) as CanActivateSecurity;
			const response = await evaluateGuardResult(await guard.canActivate({ ...context, scheme, scopes }), new UnauthorizedException());
			if (response) {
				return response;
			}
		}

		if (satisfied) {
			return undefined;
		}
	}

	if (attempted) {
		throw new UnauthorizedException();
	}

	return undefined;
}

async function runInterceptors(
	interceptors: Array<new(...args: any[]) => Interceptor>,
	context: InterceptorContext,
	finalHandler: () => Promise<unknown>,
	requestScope: ReturnType<Container["createRequestScope"]>,
	visibleTokens: Set<ProviderToken>,
): Promise<unknown> {
	if (interceptors.length === 0) {
		return finalHandler();
	}

	let index = -1;
	const dispatch = async (nextIndex: number): Promise<unknown> => {
		if (nextIndex <= index) {
			throw new Error("Interceptor next() called multiple times");
		}

		index = nextIndex;
		const InterceptorClass = interceptors[nextIndex];
		if (!InterceptorClass) {
			return finalHandler();
		}

		const interceptor = requestScope.instantiate(InterceptorClass, visibleTokens) as Interceptor;
		return interceptor.intercept(context, () => dispatch(nextIndex + 1));
	};

	return dispatch(0);
}

function createHandler(
	ctor: new(...args: any[]) => any,
	method: MethodMetadata,
	controllerGuards: Array<new(...args: any[]) => CanActivate>,
	controllerInterceptors: Array<new(...args: any[]) => Interceptor>,
	controllerMiddleware: MiddlewareFunction[],
	controllerVisibility: Set<ProviderToken>,
	controllerSecurity: Record<string, string[]>[] | undefined,
	validateResponse: boolean,
	adapter: SchemaAdapter,
	container: Container,
	errorFormatter?: ErrorFormatter,
	securityGuards?: Record<string, new(...args: any[]) => CanActivateSecurity>,
	viewEngine?: ViewEngine,
): (req: Request, server: Server<undefined>) => Response | Promise<Response> {
	return async (req: Request, _server: Server<undefined>): Promise<Response> => {
		try {
			const url = new URL(req.url);

			// Parse query params
			let query: Record<string, string | string[] | undefined> = {};
			for (const [key, value] of url.searchParams.entries()) {
				const existing = query[key];
				if (existing !== undefined) {
					query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
				} else {
					query[key] = value;
				}
			}

			// Validate query params
			if (method.query) {
				if (adapter.coerce) query = adapter.coerce(method.query, query) as typeof query;
				const result = adapter.validate(method.query, query);
				if (!result.ok) {
					throw new BadRequestException({ message: "Query validation failed", errors: result.errors });
				}
				query = result.value as typeof query;
			}

			// Parse path params from the request (Bun provides these via req.params)
			let params: Record<string, string> = (req as any).params ?? {};
			if (method.params) {
				if (adapter.coerce) params = adapter.coerce(method.params, params) as typeof params;
				const result = adapter.validate(method.params, params);
				if (!result.ok) {
					throw new BadRequestException({ message: "Path parameter validation failed", errors: result.errors });
				}
				params = result.value as typeof params;
			}

			// Parse headers
			const rawHeaders: Record<string, string> = {};
			req.headers.forEach((value, key) => {
				rawHeaders[key] = value;
			});

			let headers: Record<string, string | undefined> = rawHeaders;
			if (method.headers) {
				const result = adapter.validate(method.headers, rawHeaders);
				if (!result.ok) {
					throw new BadRequestException({ message: "Header validation failed", errors: result.errors });
				}
				headers = result.value as typeof headers;
			}

			// Parse body
			let body: unknown = undefined;
			if (requiresBody(method)) {
				const contentType = req.headers.get("content-type") ?? "";
				if (contentType.includes("application/json")) {
					try {
						body = await req.json();
					} catch {
						throw new BadRequestException("Invalid JSON in request body");
					}
				} else if (contentType.includes("text/")) {
					body = await req.text();
				} else {
					body = await req.arrayBuffer();
				}

				if (method.body) {
					const result = adapter.validate(method.body.schema, body);
					if (!result.ok) {
						throw new BadRequestException({ message: "Request body validation failed", errors: result.errors });
					}
					body = result.value;
				}
			}

			const parameterTypes: unknown[] = Reflect.getOwnMetadata("design:paramtypes", ctor.prototype, method.propertyKey) ?? [];
			const resolveArgs = async (): Promise<unknown[]> => {
				const args: unknown[] = Array.from({ length: parameterTypes.length });

				for (const routeParam of method.routeParams) {
					const expectedType = parameterTypes[routeParam.index];

					switch (routeParam.source) {
						case "param": {
							if (routeParam.mode === "scalar") {
								const result = coercePrimitiveValue((params as Record<string, unknown>)[routeParam.key!], expectedType, true, `Path parameter \"${routeParam.key}\"`);
								if (!result.ok) {
									throw new BadRequestException({ message: "Path parameter validation failed", errors: [{ path: `/${routeParam.key}`, message: result.message }] });
								}
								args[routeParam.index] = result.value;
								break;
							}

							args[routeParam.index] = params;
							break;
						}
						case "query": {
							if (routeParam.mode === "scalar") {
								const result = coercePrimitiveValue((query as Record<string, unknown>)[routeParam.key!], expectedType, false, `Query parameter \"${routeParam.key}\"`);
								if (!result.ok) {
									throw new BadRequestException({ message: "Query validation failed", errors: [{ path: `/${routeParam.key}`, message: result.message }] });
								}
								args[routeParam.index] = result.value;
								break;
							}

							args[routeParam.index] = query;
							break;
						}
						case "header": {
							if (routeParam.mode === "scalar") {
								const result = coercePrimitiveValue(req.headers.get(routeParam.key!), expectedType, false, `Header \"${routeParam.key}\"`);
								if (!result.ok) {
									throw new BadRequestException({ message: "Header validation failed", errors: [{ path: `/${routeParam.key}`, message: result.message }] });
								}
								args[routeParam.index] = result.value;
								break;
							}

							args[routeParam.index] = headers;
							break;
						}
						case "body":
							args[routeParam.index] = body;
							break;
						case "request":
							args[routeParam.index] = req;
							break;
					}
				}

				return args;
			};

			// Core handler: instantiate controller, invoke method, build response
			const execute = async (): Promise<Response> => {
				const requestScope = container.createRequestScope();
				const guardContext: GuardContext = {
					request: req,
					params,
					query,
					headers,
					body,
					className: ctor.name,
					methodName: method.propertyKey,
				};

				return callerContextStorage.run(
					{ className: ctor.name, methodName: method.propertyKey },
					async () => {
						const guardResponse = await runGuards(
							[
								...controllerGuards,
								...(method.guards ?? []),
							],
							guardContext,
							requestScope,
							controllerVisibility,
						);
						if (guardResponse) {
							return guardResponse;
						}

						const securityResponse = await runSecurityGuards(method.security ?? controllerSecurity, securityGuards, guardContext, requestScope, controllerVisibility);
						if (securityResponse) {
							return securityResponse;
						}

						const resolvedArgs = await resolveArgs();

						const controller = requestScope.instantiate(ctor, controllerVisibility);
						const fn = controller[method.propertyKey];
						const interceptorContext: InterceptorContext = {
							request: req,
							params: params,
							query: query,
							headers: headers,
							body: body,
							className: ctor.name,
							methodName: method.propertyKey,
							controller: controller,
							handlerName: method.propertyKey,
						};
						const returnValue = await runInterceptors(
							[...controllerInterceptors, ...(method.interceptors ?? [])],
							interceptorContext,
							() => Promise.resolve(fn.call(controller, ...resolvedArgs)),
							requestScope,
							controllerVisibility,
						);

						if (returnValue instanceof Response) {
							return returnValue;
						}

						if (method.render) {
							const status = (controller instanceof Controller ? controller.getStatus() : undefined) ?? 200;
							const responseHeaders = controller instanceof Controller ? controller.getHeaders() : {};
							const html = await viewEngine!.render(method.render, (returnValue ?? {}) as object);
							return new Response(html, {
								status,
								headers: { ...responseHeaders, "content-type": "text/html; charset=utf-8" },
							});
						}

						const status = (controller instanceof Controller ? controller.getStatus() : undefined) ?? 200;
						const responseHeaders = controller instanceof Controller ? controller.getHeaders() : {};
						const effectiveStatus = returnValue === undefined || returnValue === null
							? (status === 200 ? 204 : status)
							: status;

						if (returnValue === undefined || returnValue === null) {
							return new Response(
								null,
								{ status: effectiveStatus, headers: responseHeaders },
							);
						}

						const validatedReturnValue = validateResponse
							? validateResponseBody(method, effectiveStatus, returnValue, adapter)
							: returnValue;

						const contentType = method.produces ?? "application/json";
						if (contentType === "application/json") {
							return Response.json(validatedReturnValue, { status: effectiveStatus, headers: responseHeaders });
						}

						return new Response(validatedReturnValue as string | ArrayBuffer | Blob | ReadableStream, {
							status: effectiveStatus,
							headers: { ...responseHeaders, "content-type": contentType },
						});
					},
				);
			};

			// Compose and run middleware chain
			const allMiddleware = [...controllerMiddleware, ...(method.middleware ?? [])];
			if (allMiddleware.length === 0) {
				return await execute();
			}

			let idx = 0;
			const next = (): Promise<Response> => {
				if (idx >= allMiddleware.length) return execute();
				return Promise.resolve(allMiddleware[idx++](req, next));
			};
			return await next();
		} catch (error) {
			return formatErrorResponse(error, req, errorFormatter);
		}
	};
}

function normalizePath(prefix: string, methodPath?: string): string {
	const p = prefix === "/" ? "" : (prefix.endsWith("/") ? prefix.slice(0, -1) : prefix);
	if (!methodPath || methodPath === "/") return p || "/";
	const m = methodPath.startsWith("/") ? methodPath : "/" + methodPath;
	return p + (m.length > 1 && m.endsWith("/") ? m.slice(0, -1) : m);
}
