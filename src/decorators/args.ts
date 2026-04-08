import {
	addRouteParam,
	getOrCreateMethod,
} from "../metadata.js";

export function Param(config?: string | unknown) {
	return function(target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void {
		if (propertyKey == null) {
			throw new Error("Request parameter decorators are only supported on controller methods.");
		}

		const name = propertyKey as string;
		if (typeof config === "string") {
			addRouteParam(target, name, { index: parameterIndex, source: "param", mode: "scalar", key: config });
			return;
		}

		if (config === undefined) {
			addRouteParam(target, name, { index: parameterIndex, source: "param", mode: "raw" });
			return;
		}

		getOrCreateMethod(target, name).params = config;
		addRouteParam(target, name, { index: parameterIndex, source: "param", mode: "schema", schema: config });
	};
}

export function Query(config?: string | unknown) {
	return function(target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void {
		if (propertyKey == null) {
			throw new Error("Request parameter decorators are only supported on controller methods.");
		}

		const name = propertyKey as string;
		if (typeof config === "string") {
			addRouteParam(target, name, { index: parameterIndex, source: "query", mode: "scalar", key: config });
			return;
		}

		if (config === undefined) {
			addRouteParam(target, name, { index: parameterIndex, source: "query", mode: "raw" });
			return;
		}

		getOrCreateMethod(target, name).query = config;
		addRouteParam(target, name, { index: parameterIndex, source: "query", mode: "schema", schema: config });
	};
}

export function Header(config?: string | unknown) {
	return function(target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void {
		if (propertyKey == null) {
			throw new Error("Request parameter decorators are only supported on controller methods.");
		}

		const name = propertyKey as string;
		if (typeof config === "string") {
			addRouteParam(target, name, { index: parameterIndex, source: "header", mode: "scalar", key: config });
			return;
		}

		if (config === undefined) {
			addRouteParam(target, name, { index: parameterIndex, source: "header", mode: "raw" });
			return;
		}

		getOrCreateMethod(target, name).headers = config;
		addRouteParam(target, name, { index: parameterIndex, source: "header", mode: "schema", schema: config });
	};
}

export function Request() {
	return function(target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void {
		if (propertyKey == null) {
			throw new Error("@Request() is only supported on controller methods.");
		}

		addRouteParam(target, propertyKey as string, { index: parameterIndex, source: "request", mode: "raw" });
	};
}
