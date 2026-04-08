import {
	getOrCreateMethod,
	type HttpVerb,
} from "../metadata.js";

function createVerbDecorator(verb: HttpVerb) {
	return function(path?: string) {
		return function(target: object, propertyKey: string, descriptor: PropertyDescriptor): void {
			const entry = getOrCreateMethod(target, propertyKey);
			entry.verb = verb;
			if (path !== undefined) entry.path = path;
		};
	};
}

export const Get = createVerbDecorator("GET");
export const Post = createVerbDecorator("POST");
export const Put = createVerbDecorator("PUT");
export const Delete = createVerbDecorator("DELETE");
export const Patch = createVerbDecorator("PATCH");
