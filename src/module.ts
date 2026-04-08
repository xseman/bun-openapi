import { MODULE_METADATA } from "./metadata.js";
import type { ProviderToken } from "./metadata.js";
import type {
	ModuleClass,
	ModuleMetadata,
	Provider,
} from "./types.js";

export interface ResolvedModules {
	controllers: (new(...args: any[]) => any)[];
	providers: Provider[];
	exportedTokens: Set<ProviderToken>;
	controllerVisibility: Map<new(...args: any[]) => any, Set<ProviderToken>>;
	providerVisibility: Map<ProviderToken, Set<ProviderToken>>;
}

interface ModuleResolution {
	exportedProviders: Provider[];
	exportedTokens: Set<ProviderToken>;
}

function getProviderToken(provider: Provider): ProviderToken {
	return typeof provider === "function" ? provider : provider.provide;
}

function formatToken(token: ProviderToken): string {
	return typeof token === "function" ? token.name : String(token);
}

function formatModulePath(stack: ModuleClass[], current: ModuleClass): string {
	return [...stack.map((mod) => mod.name), current.name].join(" -> ");
}

function cloneTokens(tokens: Set<ProviderToken>): Set<ProviderToken> {
	return new Set(tokens);
}

/**
 * Walk the module import graph and collect controllers and providers.
 * Only providers listed in a module's `exports` are visible to importing modules.
 */
export function resolveModules(modules: ModuleClass[]): ResolvedModules {
	const controllers: (new(...args: any[]) => any)[] = [];
	const providers: Provider[] = [];
	const resolved = new Map<ModuleClass, ModuleResolution>();
	const resolving = new Set<ModuleClass>();
	const stack: ModuleClass[] = [];
	const controllerVisibility = new Map<new(...args: any[]) => any, Set<ProviderToken>>();
	const providerVisibility = new Map<ProviderToken, Set<ProviderToken>>();

	function resolve(mod: ModuleClass): ModuleResolution {
		if (resolving.has(mod)) {
			throw new Error(`Circular module import detected: ${formatModulePath(stack, mod)}`);
		}
		const cached = resolved.get(mod);
		if (cached) return cached;

		resolving.add(mod);
		stack.push(mod);

		try {
			const moduleMeta = Reflect.getOwnMetadata(MODULE_METADATA, mod) as ModuleMetadata | undefined;
			if (!moduleMeta) {
				throw new Error(`Class "${mod.name}" is not decorated with @Module()`);
			}

			// Recursively resolve imported modules first
			// Child modules register their own providers/controllers internally,
			// so we only collect the exported providers for this module's use.
			const importedProviders: Provider[] = [];
			const importedTokens = new Set<ProviderToken>();
			for (const importedModule of moduleMeta.imports ?? []) {
				const importedResolution = resolve(importedModule);
				importedProviders.push(...importedResolution.exportedProviders);
				for (const token of importedResolution.exportedTokens) {
					importedTokens.add(token);
				}
			}

			// Register this module's own providers
			const ownProviders = moduleMeta.providers ?? [];
			providers.push(...ownProviders);
			const ownTokens = new Set(ownProviders.map(getProviderToken));
			const availableTokens = new Set<ProviderToken>([...importedTokens, ...ownTokens]);
			for (const provider of ownProviders) {
				providerVisibility.set(getProviderToken(provider), cloneTokens(availableTokens));
			}

			// Collect controllers
			for (const controller of moduleMeta.controllers ?? []) {
				controllers.push(controller);
				controllerVisibility.set(controller, cloneTokens(availableTokens));
			}

			// Return only exported providers to parent modules
			const availableProviders = [...importedProviders, ...ownProviders];
			const exports = new Set(moduleMeta.exports ?? []);
			if (exports.size === 0) {
				const emptyResolution = { exportedProviders: [], exportedTokens: new Set<ProviderToken>() };
				resolved.set(mod, emptyResolution);
				return emptyResolution;
			}

			for (const token of exports) {
				if (!availableTokens.has(token)) {
					throw new Error(
						`Module "${mod.name}" cannot export provider token "${formatToken(token)}" because it is not declared locally or re-exported from an imported module.`,
					);
				}
			}

			const exportedProviders = availableProviders.filter((p) => {
				const token = getProviderToken(p);
				return exports.has(token);
			});
			const moduleResolution = {
				exportedProviders,
				exportedTokens: new Set(exportedProviders.map(getProviderToken)),
			};
			resolved.set(mod, moduleResolution);
			return moduleResolution;
		} finally {
			stack.pop();
			resolving.delete(mod);
		}
	}

	const exportedTokens = new Set<ProviderToken>();
	for (const mod of modules) {
		const moduleResolution = resolve(mod);
		for (const token of moduleResolution.exportedTokens) {
			exportedTokens.add(token);
		}
	}

	return { controllers, providers, exportedTokens, controllerVisibility, providerVisibility };
}
