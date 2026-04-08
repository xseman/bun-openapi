import {
	getConstructorInjections,
	getInjections,
	getProviderScope,
	type ProviderToken,
} from "./metadata.js";
import type {
	AliasProvider,
	ClassProvider,
	FactoryProvider,
	Provider,
	Scope,
	ValueProvider,
} from "./types.js";

interface NormalizedProvider {
	token: ProviderToken;
	scope: Scope;
	factory: (resolve: (token: ProviderToken) => unknown) => unknown;
	visibility?: Set<ProviderToken>;
}

function isClassProvider(p: Provider): p is ClassProvider {
	return typeof p === "object" && "useClass" in p;
}

function isValueProvider(p: Provider): p is ValueProvider {
	return typeof p === "object" && "useValue" in p;
}

function isFactoryProvider(p: Provider): p is FactoryProvider {
	return typeof p === "object" && "useFactory" in p;
}

function isAliasProvider(p: Provider): p is AliasProvider {
	return typeof p === "object" && "useExisting" in p;
}

function tokenName(token: ProviderToken): string {
	if (typeof token === "function") return token.name;
	return String(token);
}

function isUnsupportedImplicitConstructorToken(token: unknown): boolean {
	return token === Object || token === String || token === Number || token === Boolean || token === Array;
}

function normalizeProvider(provider: Provider): NormalizedProvider {
	// Class shorthand: providers: [MyService]
	if (typeof provider === "function") {
		const ctor = provider;
		const scope = getProviderScope(ctor);
		return {
			token: ctor,
			scope,
			factory: (resolve) => instantiateAndInject(ctor, resolve),
		};
	}

	if (isValueProvider(provider)) {
		return {
			token: provider.provide,
			scope: "singleton",
			factory: () => provider.useValue,
		};
	}

	if (isClassProvider(provider)) {
		const scope = provider.scope ?? getProviderScope(provider.useClass);
		return {
			token: provider.provide,
			scope,
			factory: (resolve) => instantiateAndInject(provider.useClass, resolve),
		};
	}

	if (isFactoryProvider(provider)) {
		const injectTokens = provider.inject ?? [];
		return {
			token: provider.provide,
			scope: provider.scope ?? "singleton",
			factory: (resolve) => {
				const args = injectTokens.map((t) => resolve(t));
				return provider.useFactory(...args);
			},
		};
	}

	if (isAliasProvider(provider)) {
		return {
			token: provider.provide,
			scope: "singleton",
			factory: (resolve) => resolve(provider.useExisting),
		};
	}

	throw new Error("Invalid provider configuration");
}

function instantiateAndInject(
	ctor: new(...args: any[]) => any,
	resolve: (token: ProviderToken) => unknown,
): any {
	const reflectedParamTypes: unknown[] = Reflect.getOwnMetadata("design:paramtypes", ctor) ?? [];
	const constructorInjections = new Map(
		getConstructorInjections(ctor).map((entry) => [entry.index, entry.token] as const),
	);
	const args = reflectedParamTypes.map((reflectedType, index) => {
		const explicitToken = constructorInjections.get(index);
		const token = explicitToken ?? reflectedType;

		if (token == null || (!explicitToken && isUnsupportedImplicitConstructorToken(token))) {
			throw new Error(
				`Cannot resolve constructor parameter ${index} of ${ctor.name}. Use @Inject(...) for non-class tokens.`,
			);
		}

		return resolve(token as ProviderToken);
	});

	const instance = new ctor(...args);
	const injections = getInjections(ctor);
	for (const { fieldName, token } of injections) {
		(instance as any)[fieldName] = resolve(token);
	}
	return instance;
}

function getVisibleProvider(
	token: ProviderToken,
	provider: NormalizedProvider | undefined,
	visibleTokens?: Set<ProviderToken>,
): NormalizedProvider {
	if (!provider) {
		throw new Error(`No provider found for token: ${tokenName(token)}`);
	}

	if (visibleTokens && !visibleTokens.has(token)) {
		throw new Error(`Provider token "${tokenName(token)}" is not visible in this module context.`);
	}

	return provider;
}

/**
 * Lightweight DI container.
 *
 * - Registers providers and resolves them by token.
 * - Singletons are resolved once and cached for the app lifetime.
 * - Request-scoped providers are resolved per-request via `createRequestScope()`.
 */
export class Container {
	#providers = new Map<ProviderToken, NormalizedProvider>();
	#singletons = new Map<ProviderToken, unknown>();
	#resolving = new Set<ProviderToken>();

	register(provider: Provider, visibleTokens?: Iterable<ProviderToken>): void {
		const normalized = normalizeProvider(provider);
		this.#providers.set(normalized.token, {
			...normalized,
			visibility: visibleTokens ? new Set(visibleTokens) : undefined,
		});
	}

	resolve(token: ProviderToken, visibleTokens?: Set<ProviderToken>): unknown {
		const provider = getVisibleProvider(token, this.#providers.get(token), visibleTokens);

		// Check singleton cache first
		if (this.#singletons.has(token)) {
			return this.#singletons.get(token);
		}

		if (provider.scope === "request") {
			throw new Error(
				`Cannot resolve request-scoped provider "${tokenName(token)}" from the root container. Use createRequestScope() instead.`,
			);
		}

		// Circular dependency detection
		if (this.#resolving.has(token)) {
			throw new Error(`Circular dependency detected for token: ${tokenName(token)}`);
		}

		this.#resolving.add(token);
		try {
			const instance = provider.factory((t) => this.resolve(t, provider.visibility));
			this.#singletons.set(token, instance);
			return instance;
		} finally {
			this.#resolving.delete(token);
		}
	}

	has(token: ProviderToken): boolean {
		return this.#providers.has(token);
	}

	getScope(token: ProviderToken): Scope | undefined {
		return this.#providers.get(token)?.scope;
	}

	/** @internal */
	getProvider(token: ProviderToken): NormalizedProvider | undefined {
		return this.#providers.get(token);
	}

	createRequestScope(): RequestScope {
		return new RequestScope(this);
	}

	/**
	 * Instantiate a class and inject its @Inject() fields.
	 * Used for controllers (which are not registered as providers themselves).
	 */
	instantiate(ctor: new(...args: any[]) => any, visibleTokens?: Set<ProviderToken>): any {
		return instantiateAndInject(ctor, (t) => this.resolve(t, visibleTokens));
	}
}

/**
 * A child scope for per-request provider resolution.
 * Inherits singleton cache from the parent container.
 * Maintains its own cache for request-scoped instances.
 */
export class RequestScope {
	#container: Container;
	#cache = new Map<ProviderToken, unknown>();
	#resolving = new Set<ProviderToken>();

	constructor(container: Container) {
		this.#container = container;
	}

	resolve(token: ProviderToken, visibleTokens?: Set<ProviderToken>): unknown {
		const provider = getVisibleProvider(token, this.#container.getProvider(token), visibleTokens);

		// Request-scoped cache
		if (this.#cache.has(token)) {
			return this.#cache.get(token);
		}

		const scope = provider.scope;

		// Singleton or unknown → delegate to parent
		if (scope !== "request") {
			return this.#container.resolve(token, visibleTokens);
		}

		// Circular dependency detection
		if (this.#resolving.has(token)) {
			throw new Error(`Circular dependency detected for token: ${tokenName(token)}`);
		}

		this.#resolving.add(token);
		try {
			const instance = provider.factory((t) => this.resolve(t, provider.visibility));
			this.#cache.set(token, instance);
			return instance;
		} finally {
			this.#resolving.delete(token);
		}
	}

	/**
	 * Instantiate a class and inject its @Inject() fields.
	 * Request-scoped providers are resolved from this scope.
	 */
	instantiate(ctor: new(...args: any[]) => any, visibleTokens?: Set<ProviderToken>): any {
		return instantiateAndInject(ctor, (t) => this.resolve(t, visibleTokens));
	}
}
