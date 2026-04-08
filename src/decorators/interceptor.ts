import {
	CONTROLLER_INTERCEPTORS,
	getOrCreateMethod,
	type Interceptor,
} from "../metadata.js";

export function UseInterceptors(...interceptors: Array<new(...args: any[]) => Interceptor>) {
	return function(target: any, propertyKeyOrDescriptor?: string | PropertyDescriptor): void {
		if (typeof propertyKeyOrDescriptor === "string") {
			const method = getOrCreateMethod(target, propertyKeyOrDescriptor);
			method.interceptors ??= [];
			method.interceptors.push(...interceptors);
			return;
		}

		const existing: Array<new(...args: any[]) => Interceptor> = Reflect.getOwnMetadata(CONTROLLER_INTERCEPTORS, target) ?? [];
		existing.push(...interceptors);
		Reflect.defineMetadata(CONTROLLER_INTERCEPTORS, existing, target);
	};
}
