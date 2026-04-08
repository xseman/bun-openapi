import {
	addRouteParam,
	getOrCreateMethod,
} from "../metadata.js";

export function Body(schema?: unknown, contentType = "application/json") {
	return function(target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void {
		if (propertyKey == null) {
			throw new Error("@Body() is only supported on controller methods.");
		}

		const name = propertyKey as string;
		if (schema != null) {
			getOrCreateMethod(target, name).body = { schema, contentType };
		}
		addRouteParam(target, name, {
			index: parameterIndex,
			source: "body",
			mode: schema == null ? "raw" : "schema",
			schema,
			contentType,
		});
	};
}
