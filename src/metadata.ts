import "reflect-metadata";

// --- Symbol keys for metadata ---

export const ROUTE_PREFIX = Symbol("route:prefix");
export const METHODS = Symbol("route:methods");
export const CONTROLLER_TAGS = Symbol("controller:tags");
export const CONTROLLER_SECURITY = Symbol("controller:security");
export const CONTROLLER_GUARDS = Symbol("controller:guards");
export const CONTROLLER_MIDDLEWARE = Symbol("controller:middleware");
export const CONTROLLER_INTERCEPTORS = Symbol("controller:interceptors");
export const CONTROLLER_VALIDATE_RESPONSE = Symbol("controller:validate-response");

// --- DI metadata symbols ---

export const INJECTIONS = Symbol("di:injections");
export const CONSTRUCTOR_INJECTIONS = Symbol("di:constructor-injections");
export const INJECTABLE = Symbol("di:injectable");
export const PROVIDER_SCOPE = Symbol("di:scope");

// --- Module metadata symbols ---

export const MODULE_METADATA = Symbol("module:metadata");

// --- Types ---

export type HttpVerb = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type RouteParamSource = "param" | "query" | "header" | "body" | "request";
export type RouteParamMode = "scalar" | "schema" | "raw";

export interface ResponseMeta {
	schema?: unknown;
	description?: string;
}

export interface BodyMeta {
	schema: unknown;
	contentType: string;
}

export interface RouteParamEntry {
	index: number;
	source: RouteParamSource;
	mode: RouteParamMode;
	key?: string;
	schema?: unknown;
	contentType?: string;
}

export interface MethodMetadata {
	propertyKey: string;
	verb: HttpVerb;
	routeParams: RouteParamEntry[];
	path?: string;
	params?: unknown;
	query?: unknown;
	headers?: unknown;
	body?: BodyMeta;
	responses: Map<number, ResponseMeta>;
	tags?: string[];
	operationId?: string;
	deprecated?: boolean;
	hidden?: boolean;
	summary?: string;
	description?: string;
	produces?: string;
	security?: Record<string, string[]>[];
	guards?: Array<new(...args: any[]) => CanActivate>;
	middleware?: MiddlewareFunction[];
	interceptors?: Array<new(...args: any[]) => Interceptor>;
	validateResponse?: boolean;
	/** Template name to render via the view engine (set by @Render decorator). Excluded from OpenAPI spec. */
	render?: string;
}

export interface GuardContext {
	request: Request;
	params: Record<string, string>;
	query: Record<string, string | string[] | undefined>;
	headers: Record<string, string | undefined>;
	body: unknown;
	className: string;
	methodName: string;
}

export interface SecurityGuardContext extends GuardContext {
	scheme: string;
	scopes: string[];
}

export interface InterceptorContext extends GuardContext {
	controller: object;
	handlerName: string;
}

export type GuardResult = boolean | Response | void;

export interface CanActivate {
	canActivate(context: GuardContext): GuardResult | Promise<GuardResult>;
}

export interface CanActivateSecurity {
	canActivate(context: SecurityGuardContext): GuardResult | Promise<GuardResult>;
}

export type MiddlewareFunction = (
	request: Request,
	next: () => Promise<Response>,
) => Response | Promise<Response>;

export interface Interceptor {
	intercept(context: InterceptorContext, next: () => Promise<unknown>): unknown | Promise<unknown>;
}

export type ProviderToken = (new(...args: any[]) => any) | string | symbol;

export interface InjectionEntry {
	fieldName: string | symbol;
	token: ProviderToken;
}

export interface ConstructorInjectionEntry {
	index: number;
	token: ProviderToken;
}

/**
 * Get or create a MethodMetadata entry for a given method on a class.
 * Decorators run bottom-to-top, so schema decorators may run
 * before the verb decorator. This ensures the entry exists regardless of order.
 */
export function getOrCreateMethod(target: object, propertyKey: string): MethodMetadata {
	const methods: MethodMetadata[] = Reflect.getOwnMetadata(METHODS, target.constructor) ?? [];
	let entry = methods.find((m) => m.propertyKey === propertyKey);
	if (!entry) {
		entry = {
			propertyKey,
			verb: undefined as unknown as HttpVerb,
			routeParams: [],
			responses: new Map(),
		};
		methods.push(entry);
		Reflect.defineMetadata(METHODS, methods, target.constructor);
	}
	return entry;
}

/**
 * Get the list of MethodMetadata from a class.
 */
export function getMethodsMetadata(target: abstract new(...args: any[]) => any): MethodMetadata[] {
	return Reflect.getOwnMetadata(METHODS, target) ?? [];
}

/**
 * Get the route prefix from a class.
 */
export function getRoutePrefix(target: abstract new(...args: any[]) => any): string {
	return Reflect.getOwnMetadata(ROUTE_PREFIX, target) ?? "/";
}

/**
 * Get the injection metadata (list of @Inject fields) from a class.
 */
export function getInjections(target: abstract new(...args: any[]) => any): InjectionEntry[] {
	return Reflect.getOwnMetadata(INJECTIONS, target) ?? [];
}

export function getConstructorInjections(target: abstract new(...args: any[]) => any): ConstructorInjectionEntry[] {
	return Reflect.getOwnMetadata(CONSTRUCTOR_INJECTIONS, target) ?? [];
}

/**
 * Get the provider scope declared via @Injectable({ scope }).
 */
export function getProviderScope(target: abstract new(...args: any[]) => any): "singleton" | "request" {
	return Reflect.getOwnMetadata(PROVIDER_SCOPE, target) ?? "singleton";
}

export function addRouteParam(target: object, propertyKey: string, routeParam: RouteParamEntry): void {
	const method = getOrCreateMethod(target, propertyKey);

	const existingAtIndex = method.routeParams.find((entry) => entry.index === routeParam.index);
	if (existingAtIndex) {
		throw new Error(`Method \"${propertyKey}\" already has a request decorator on parameter ${routeParam.index}.`);
	}

	if (routeParam.source === "body") {
		const existingBody = method.routeParams.find((entry) => entry.source === "body");
		if (existingBody) {
			throw new Error(`Method \"${propertyKey}\" cannot declare more than one body binding.`);
		}
	}

	if (routeParam.source === "request") {
		const existingRequest = method.routeParams.find((entry) => entry.source === "request");
		if (existingRequest) {
			throw new Error(`Method \"${propertyKey}\" cannot declare more than one request binding.`);
		}
	}

	if (routeParam.source !== "body" && routeParam.source !== "request") {
		const sourceBindings = method.routeParams.filter((entry) => entry.source === routeParam.source);
		const hasWholeObjectBinding = sourceBindings.some((entry) => entry.mode !== "scalar");
		const hasScalarBinding = sourceBindings.some((entry) => entry.mode === "scalar");
		if (routeParam.mode === "scalar" && hasWholeObjectBinding) {
			throw new Error(`Method \"${propertyKey}\" cannot mix scalar and whole-object ${routeParam.source} bindings.`);
		}
		if (routeParam.mode !== "scalar" && hasScalarBinding) {
			throw new Error(`Method \"${propertyKey}\" cannot mix scalar and whole-object ${routeParam.source} bindings.`);
		}
		if (routeParam.mode !== "scalar" && sourceBindings.length > 0) {
			throw new Error(`Method \"${propertyKey}\" cannot declare more than one whole-object ${routeParam.source} binding.`);
		}
	}

	method.routeParams.push(routeParam);
	method.routeParams.sort((left, right) => left.index - right.index);
}
