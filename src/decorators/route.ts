import { ROUTE_PREFIX } from "../metadata.js";

export function Route(prefix: string = "/") {
	return function(target: Function) {
		Reflect.defineMetadata(ROUTE_PREFIX, prefix, target);
	};
}
