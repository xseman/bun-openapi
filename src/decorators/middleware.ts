import {
	CONTROLLER_MIDDLEWARE,
	getOrCreateMethod,
	type MiddlewareFunction,
} from "../metadata.js";

/**
 * Attach middleware to a controller class or a specific method.
 */
export function Middleware(...fns: MiddlewareFunction[]) {
	return function(target: any, propertyKeyOrDescriptor?: string | PropertyDescriptor, descriptor?: PropertyDescriptor): void {
		if (typeof propertyKeyOrDescriptor === "string") {
			// Method decorator
			const method = getOrCreateMethod(target, propertyKeyOrDescriptor);
			method.middleware ??= [];
			method.middleware.push(...fns);
		} else {
			// Class decorator
			const existing: MiddlewareFunction[] = Reflect.getOwnMetadata(CONTROLLER_MIDDLEWARE, target) ?? [];
			existing.push(...fns);
			Reflect.defineMetadata(CONTROLLER_MIDDLEWARE, existing, target);
		}
	};
}
