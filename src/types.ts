import type {
	Serve,
	Server,
} from "bun";

import type { SchemaAdapter } from "./adapter.js";
import type {
	CanActivate,
	CanActivateSecurity,
	Interceptor,
	MiddlewareFunction,
	ProviderToken,
} from "./metadata.js";
import type { ViewEngineConfig } from "./view-engine.js";
export type { ViewEngineConfig } from "./view-engine.js";

/**
 * A single route value: method-specific handlers or a direct handler.
 * Uses Bun's native Serve.HTTPMethod and handler types.
 */
export type RouteHandler =
	| ((req: Request, server: Server<undefined>) => Response | Promise<Response>)
	| Partial<Record<Serve.HTTPMethod, ((req: Request, server: Server<undefined>) => Response | Promise<Response>) | Response>>;

// --- DI Provider Types ---

export type Scope = "singleton" | "request";

export interface ClassProvider {
	provide: ProviderToken;
	useClass: new(...args: any[]) => any;
	scope?: Scope;
}

export interface ValueProvider {
	provide: ProviderToken;
	useValue: unknown;
}

export interface FactoryProvider {
	provide: ProviderToken;
	useFactory: (...args: any[]) => unknown;
	inject?: ProviderToken[];
	scope?: Scope;
}

export interface AliasProvider {
	provide: ProviderToken;
	useExisting: ProviderToken;
}

export type Provider =
	| (new(...args: any[]) => any)
	| ClassProvider
	| ValueProvider
	| FactoryProvider
	| AliasProvider;

// --- Module Types ---

export interface ModuleMetadata {
	controllers?: (new(...args: any[]) => any)[];
	providers?: Provider[];
	imports?: ModuleClass[];
	exports?: ProviderToken[];
}

export type ModuleClass = new(...args: any[]) => any;

export interface OpenAPIConfig {
	/** Write spec to disk at this path (optional) */
	filePath?: string;
	/** Service info for OpenAPI info block */
	service: {
		name: string;
		version: string;
		description?: string;
	};
	/** Security scheme definitions */
	securitySchemes?: Record<string, SecuritySchemeObject>;
}

export interface SecuritySchemeObject {
	type: "apiKey" | "http" | "oauth2" | "openIdConnect";
	description?: string;
	name?: string;
	in?: "query" | "header" | "cookie";
	scheme?: string;
	bearerFormat?: string;
	flows?: Record<string, unknown>;
	openIdConnectUrl?: string;
}

export interface SwaggerUIConfig {
	/** Path to serve Swagger UI at (default: "/docs/swagger") */
	path?: string;
}

export interface ModuleViewerConfig {
	/** Path to serve module hierarchy viewer at (default: "/docs/modules") */
	path?: string;
	/** Path to serve a static SVG rendering at (default: "{path}/tree.svg"). Set to false to disable. */
	svgPath?: string | false;
}

export interface ErrorFormatterContext {
	request: Request;
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

export interface ErrorFormatterResult {
	status?: number;
	headers?: HeadersInit;
	body?: unknown;
}

export type ErrorFormatter = (
	error: unknown,
	context: ErrorFormatterContext,
) => Response | ErrorFormatterResult;

export interface AppConfig {
	controllers?: (new(...args: any[]) => any)[];
	schema: SchemaAdapter;
	openapi?: OpenAPIConfig;
	validateResponse?: boolean;
	errorFormatter?: ErrorFormatter;
	/** Global guards applied to every route after request parsing and before the handler */
	guards?: Array<new(...args: any[]) => CanActivate>;
	/** Global interceptors applied to every route around handler execution */
	interceptors?: Array<new(...args: any[]) => Interceptor>;
	/** Global middleware applied to every route (runs before controller and method middleware) */
	middlewares?: MiddlewareFunction[];
	/** Runtime guards used to enforce routes decorated with @Security(...) */
	securityGuards?: Record<string, new(...args: any[]) => CanActivateSecurity>;
	/** Enable Swagger UI. Set to true for defaults, or provide config. */
	swagger?: boolean | SwaggerUIConfig;
	/** Enable hierarchy viewer for imported modules and/or direct app controllers/providers. Set to true for defaults, or provide config. */
	moduleViewer?: boolean | ModuleViewerConfig;
	/** DI providers available for injection into controllers and other providers */
	providers?: Provider[];
	/** Module classes to import (resolves controllers and providers from modules) */
	imports?: ModuleClass[];
	/** View engine configuration for server-side template rendering via @Render decorator */
	viewEngine?: ViewEngineConfig;
}

export interface AppResult {
	/** Routes object, directly spreadable into Bun.serve({ routes }) */
	routes: Record<string, RouteHandler>;
	/** Fallback fetch handler for unmatched routes */
	fetch: (req: Request, server: Server<undefined>) => Response | Promise<Response>;
	/** Generated OpenAPI 3.0 document */
	spec: OpenAPIDocument;
}

// --- OpenAPI 3.0 Types ---

export interface OpenAPIDocument {
	openapi: "3.0.3";
	info: OpenAPIInfo;
	paths: Record<string, OpenAPIPathItem>;
	components?: OpenAPIComponents;
	security?: Record<string, string[]>[];
	tags?: OpenAPITag[];
}

export interface OpenAPIInfo {
	title: string;
	version: string;
	description?: string;
}

export interface OpenAPIPathItem {
	[method: string]: OpenAPIOperation | undefined;
}

export interface OpenAPIOperation {
	operationId?: string;
	summary?: string;
	description?: string;
	tags?: string[];
	deprecated?: boolean;
	parameters?: OpenAPIParameter[];
	requestBody?: OpenAPIRequestBody;
	responses: Record<string, OpenAPIResponse>;
	security?: Record<string, string[]>[];
}

export interface OpenAPIParameter {
	name: string;
	in: "path" | "query" | "header";
	required?: boolean;
	schema: Record<string, unknown>;
	description?: string;
}

export interface OpenAPIRequestBody {
	required?: boolean;
	content: Record<string, OpenAPIMediaType>;
	description?: string;
}

export interface OpenAPIMediaType {
	schema: Record<string, unknown>;
}

export interface OpenAPIResponse {
	description: string;
	content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIComponents {
	schemas?: Record<string, Record<string, unknown>>;
	securitySchemes?: Record<string, SecuritySchemeObject>;
}

export interface OpenAPITag {
	name: string;
	description?: string;
}
