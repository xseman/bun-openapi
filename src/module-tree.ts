import {
	CONTROLLER_MIDDLEWARE,
	getMethodsMetadata,
	getProviderScope,
	getRoutePrefix,
	type MiddlewareFunction,
	MODULE_METADATA,
} from "./metadata.js";
import type {
	AliasProvider,
	ClassProvider,
	FactoryProvider,
	ModuleClass,
	ModuleMetadata,
	Provider,
	ValueProvider,
} from "./types.js";

type ControllerClass = new(...args: any[]) => any;

export interface AppTreeOptions {
	name?: string;
	controllers?: ControllerClass[];
	imports?: ModuleClass[];
	providers?: Provider[];
}

export interface ModuleTreeNode {
	name: string;
	type: "module" | "controller" | "provider" | "method" | "middleware";
	children?: ModuleTreeNode[];
	/** Controller route prefix */
	prefix?: string;
	/** HTTP verb for method nodes */
	verb?: string;
	/** Full route path for method nodes */
	path?: string;
	/** Provider scope (singleton/request) */
	scope?: string;
	/** Provider variant: class, value, factory, alias */
	providerType?: string;
	/** Module's exported token names */
	exports?: string[];
	/** True when this node is a back-reference to an already-visited module */
	ref?: boolean;
}

function tokenName(token: unknown): string {
	if (typeof token === "function") return token.name;
	return String(token);
}

function providerType(p: Provider): string {
	if (typeof p === "function") return "class";
	if ("useValue" in p) return "value";
	if ("useFactory" in p) return "factory";
	if ("useExisting" in p) return "alias";
	if ("useClass" in p) return "class";
	return "unknown";
}

function providerName(p: Provider): string {
	if (typeof p === "function") return p.name;
	return tokenName(p.provide);
}

function providerScope(p: Provider): string {
	if (typeof p === "function") return getProviderScope(p);
	if ("scope" in p && p.scope) return p.scope;
	if ("useClass" in p) return getProviderScope(p.useClass);
	return "singleton";
}

function normalizePath(prefix: string, methodPath?: string): string {
	const p = prefix === "/" ? "" : (prefix.endsWith("/") ? prefix.slice(0, -1) : prefix);
	if (!methodPath || methodPath === "/") return p || "/";
	const m = methodPath.startsWith("/") ? methodPath : "/" + methodPath;
	return p + (m.length > 1 && m.endsWith("/") ? m.slice(0, -1) : m);
}

function middlewareName(fn: MiddlewareFunction): string {
	return fn.name || "(anonymous)";
}

function buildControllerNode(ctor: ControllerClass): ModuleTreeNode {
	const prefix = getRoutePrefix(ctor);
	const methods = getMethodsMetadata(ctor);
	const controllerMw: MiddlewareFunction[] = Reflect.getOwnMetadata(CONTROLLER_MIDDLEWARE, ctor) ?? [];

	const children: ModuleTreeNode[] = [];

	// Controller-level middleware
	for (const fn of controllerMw) {
		children.push({ name: middlewareName(fn), type: "middleware" });
	}

	// Methods (with their own middleware children)
	for (const m of methods) {
		const methodChildren: ModuleTreeNode[] = [];
		for (const fn of m.middleware ?? []) {
			methodChildren.push({ name: middlewareName(fn), type: "middleware" });
		}

		children.push({
			name: `${m.verb} ${normalizePath(prefix, m.path)}`,
			type: "method" as const,
			verb: m.verb,
			path: normalizePath(prefix, m.path),
			...(methodChildren.length > 0 ? { children: methodChildren } : {}),
		});
	}

	return {
		name: ctor.name,
		type: "controller",
		prefix,
		...(children.length > 0 ? { children } : {}),
	};
}

function buildProviderNode(p: Provider): ModuleTreeNode {
	return {
		name: providerName(p),
		type: "provider",
		providerType: providerType(p),
		scope: providerScope(p),
	};
}

function buildModuleNode(mod: ModuleClass, visited: Set<ModuleClass>): ModuleTreeNode {
	if (visited.has(mod)) {
		return { name: mod.name, type: "module", ref: true };
	}
	visited.add(mod);

	const moduleMeta = Reflect.getOwnMetadata(MODULE_METADATA, mod) as ModuleMetadata | undefined;
	if (!moduleMeta) {
		throw new Error(`Class "${mod.name}" is not decorated with @Module()`);
	}

	const children: ModuleTreeNode[] = [];

	for (const imported of moduleMeta.imports ?? []) {
		children.push(buildModuleNode(imported, visited));
	}

	for (const ctor of moduleMeta.controllers ?? []) {
		children.push(buildControllerNode(ctor));
	}

	for (const provider of moduleMeta.providers ?? []) {
		children.push(buildProviderNode(provider));
	}

	const exportNames = (moduleMeta.exports ?? []).map(tokenName);

	return {
		name: mod.name,
		type: "module",
		...(children.length > 0 ? { children } : {}),
		...(exportNames.length > 0 ? { exports: exportNames } : {}),
	};
}

/**
 * Build a D3.js-compatible hierarchy tree from a module class.
 * The returned object follows the `{ name, children }` shape
 * expected by `d3.hierarchy()`.
 */
export function buildModuleTree(mod: ModuleClass): ModuleTreeNode {
	return buildModuleNode(mod, new Set<ModuleClass>());
}

export function buildAppTree(options: AppTreeOptions): ModuleTreeNode {
	const imports = options.imports ?? [];
	const controllers = options.controllers ?? [];
	const providers = options.providers ?? [];
	const hasDirectNodes = controllers.length > 0 || providers.length > 0;
	const visited = new Set<ModuleClass>();

	if (!hasDirectNodes && imports.length === 1) {
		return buildModuleNode(imports[0]!, visited);
	}

	const children: ModuleTreeNode[] = [];
	for (const imported of imports) {
		children.push(buildModuleNode(imported, visited));
	}
	for (const ctor of controllers) {
		children.push(buildControllerNode(ctor));
	}
	for (const provider of providers) {
		children.push(buildProviderNode(provider));
	}

	return {
		name: options.name ?? (hasDirectNodes ? "App" : "Root"),
		type: "module",
		...(children.length > 0 ? { children } : {}),
	};
}
