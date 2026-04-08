import {
	CONTROLLER_TAGS,
	getOrCreateMethod,
} from "../metadata.js";

/**
 * Add tags to a controller class or a specific method.
 */
export function Tags(...tags: string[]) {
	return function(target: any, propertyKeyOrDescriptor?: string | PropertyDescriptor, descriptor?: PropertyDescriptor): void {
		if (typeof propertyKeyOrDescriptor === "string") {
			// Method decorator
			getOrCreateMethod(target, propertyKeyOrDescriptor).tags = tags;
		} else {
			// Class decorator
			Reflect.defineMetadata(CONTROLLER_TAGS, tags, target);
		}
	};
}

export function OperationId(id: string) {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).operationId = id;
	};
}

export function Summary(text: string) {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).summary = text;
	};
}

export function Description(text: string) {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).description = text;
	};
}

export function Deprecated() {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).deprecated = true;
	};
}

export function Hidden() {
	return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).hidden = true;
	};
}
