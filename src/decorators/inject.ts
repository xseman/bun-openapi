import {
	CONSTRUCTOR_INJECTIONS,
	type ConstructorInjectionEntry,
	INJECTABLE,
	type InjectionEntry,
	INJECTIONS,
	MODULE_METADATA,
	PROVIDER_SCOPE,
	type ProviderToken,
} from "../metadata.js";
import type { ModuleMetadata } from "../types.js";

/**
 * Mark a class as injectable (a DI provider).
 * Optionally declare its scope.
 *
 * @example
 * ```ts
 * @Injectable()
 * class UserService { ... }
 *
 * @Injectable({ scope: "request" })
 * class RequestLogger { ... }
 * ```
 */
export function Injectable(options?: { scope?: "singleton" | "request"; }) {
	return function(target: Function) {
		Reflect.defineMetadata(INJECTABLE, true, target);
		if (options?.scope) {
			Reflect.defineMetadata(PROVIDER_SCOPE, options.scope, target);
		}
	};
}

/**
 * Inject a provider into a class field or constructor parameter.
 * The token identifies which provider to resolve.
 *
 * @example
 * ```ts
 * class UserController extends Controller {
 *   @Inject(UserService) userService!: UserService;
 *   @Inject("DB") db!: Database;
 * }
 * ```
 */
export function Inject(token: ProviderToken) {
	return function(target: object, propertyKey: string | symbol | undefined, parameterIndex?: number) {
		if (typeof parameterIndex === "number") {
			if (propertyKey !== undefined) {
				throw new Error("@Inject() is only supported on class fields and constructor parameters.");
			}

			const injections: ConstructorInjectionEntry[] = Reflect.getOwnMetadata(CONSTRUCTOR_INJECTIONS, target) ?? [];
			injections.push({ index: parameterIndex, token });
			Reflect.defineMetadata(CONSTRUCTOR_INJECTIONS, injections, target);
			return;
		}

		if (propertyKey === undefined) {
			throw new Error("@Inject() is only supported on class fields and constructor parameters.");
		}

		const injections: InjectionEntry[] = Reflect.getOwnMetadata(INJECTIONS, target.constructor) ?? [];
		injections.push({
			fieldName: propertyKey,
			token: token,
		});
		Reflect.defineMetadata(INJECTIONS, injections, target.constructor);
	};
}

/**
 * Declare a module that groups controllers and providers.
 *
 * @example
 * ```ts
 * @Module({
 *   controllers: [UserController],
 *   providers: [UserService],
 *   exports: [UserService],
 * })
 * class UserModule {}
 * ```
 */
export function Module(metadata: ModuleMetadata) {
	return function(target: Function) {
		Reflect.defineMetadata(MODULE_METADATA, metadata, target);
	};
}
