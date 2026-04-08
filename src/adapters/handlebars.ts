import type { TemplateAdapter } from "../view-engine.js";

interface HandlebarsInstance {
	compile(template: string, options?: object): (context: unknown) => string;
	registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
	registerPartial(name: string, partial: string): void;
}

export interface HandlebarsAdapterOptions {
	/** Custom helpers registered on the Handlebars instance: name → function */
	helpers?: Record<string, (...args: unknown[]) => unknown>;
	/**
	 * Named partials registered on the Handlebars instance: partial name → template source string.
	 * Use `await Bun.file(path).text()` to load partials from files.
	 */
	partials?: Record<string, string>;
}

/**
 * Handlebars template adapter for the view engine.
 * Compiles and caches templates internally for performance.
 *
 * @example
 * ```ts
 * import { HandlebarsAdapter } from "bun-openapi/adapters/handlebars";
 *
 * createApp({
 *   viewEngine: {
 *     viewsDir: "./views",
 *     adapter: new HandlebarsAdapter({
 *       helpers: { upper: (s: unknown) => String(s).toUpperCase() },
 *     }),
 *   },
 * });
 * ```
 */

export class HandlebarsAdapter implements TemplateAdapter {
	private readonly options: HandlebarsAdapterOptions;
	private readonly compiledCache = new Map<
		string,
		(context: unknown) => string
	>();
	private hbs: HandlebarsInstance | undefined;

	constructor(options: HandlebarsAdapterOptions = {}) {
		this.options = options;
	}

	private async loadHandlebars(): Promise<HandlebarsInstance> {
		if (this.hbs) return this.hbs;

		try {
			const mod = await import("handlebars");
			this.hbs = (mod.default ?? mod) as HandlebarsInstance;
		} catch {
			throw new Error(
				"HandlebarsAdapter requires 'handlebars' to be installed. Run: bun add handlebars",
			);
		}

		for (const [name, fn] of Object.entries(this.options.helpers ?? {})) {
			this.hbs.registerHelper(name, fn);
		}

		for (const [name, source] of Object.entries(this.options.partials ?? {})) {
			this.hbs.registerPartial(name, source);
		}

		return this.hbs;
	}

	async render(source: string, context: object): Promise<string> {
		const instance = await this.loadHandlebars();

		let compiled = this.compiledCache.get(source);
		if (!compiled) {
			compiled = instance.compile(source);
			this.compiledCache.set(source, compiled);
		}

		return compiled(context);
	}
}
