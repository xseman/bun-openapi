import {
	CONTROLLER_VALIDATE_RESPONSE,
	getOrCreateMethod,
} from "../metadata.js";

export function Returns(code: number, schema?: unknown, description?: string) {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).responses.set(code, { schema, description });
	};
}

export function Produces(contentType: string) {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).produces = contentType;
	};
}

export function ValidateResponse(enabled: boolean = true) {
	return function(target: any, propertyKeyOrDescriptor?: string | PropertyDescriptor): void {
		if (typeof propertyKeyOrDescriptor === "string") {
			getOrCreateMethod(target, propertyKeyOrDescriptor).validateResponse = enabled;
			return;
		}

		Reflect.defineMetadata(CONTROLLER_VALIDATE_RESPONSE, enabled, target);
	};
}
