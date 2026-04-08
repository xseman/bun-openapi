import { getOrCreateMethod } from "../metadata.js";

/**
 * Render a template file with the controller method's return value as context.
 * The method's return value is passed directly to the Handlebars template as the context object.
 * Routes decorated with @Render are excluded from the OpenAPI specification.
 *
 * Requires `viewEngine` to be configured in `createApp()`.
 *
 * @param template - Template name (relative to viewsDir, without extension)
 *
 * @example
 * ```ts
 * @Get()
 * @Render("index")
 * home() {
 *   return { title: "Home", message: "Welcome!" };
 * }
 * ```
 */
export function Render(template: string) {
	return function(target: object, propertyKey: string, _descriptor: PropertyDescriptor): void {
		getOrCreateMethod(target, propertyKey).render = template;
	};
}
