import {
	CONTROLLER_SECURITY,
	getOrCreateMethod,
} from "../metadata.js";

/**
 * Apply security requirements to a controller class or method.
 */
export function Security(scheme: string, scopes: string[] = []) {
	return function(target: any, propertyKeyOrDescriptor?: string | PropertyDescriptor): void {
		if (typeof propertyKeyOrDescriptor === "string") {
			const method = getOrCreateMethod(target, propertyKeyOrDescriptor);
			method.security ??= [];
			method.security.push({ [scheme]: scopes });
			return;
		}

		const existing: Record<string, string[]>[] = Reflect.getOwnMetadata(CONTROLLER_SECURITY, target) ?? [];
		existing.push({ [scheme]: scopes });
		Reflect.defineMetadata(CONTROLLER_SECURITY, existing, target);
	};
}
