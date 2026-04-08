import path from "node:path";

/**
 * Strategy interface for template engines.
 * Implement this to add support for any template engine (EJS, Pug, Eta, etc.).
 * Each adapter receives the raw template source and returns the rendered HTML string.
 */
export interface TemplateAdapter {
	/**
	 * Render a template source string with the given context.
	 * @param source - Raw template source text
	 * @param context - Data object passed as template variables
	 */
	render(source: string, context: object): string | Promise<string>;
}

export interface ViewEngineConfig {
	/** Directory where template files are located (absolute path recommended) */
	viewsDir: string;
	/** Template adapter to use for rendering. Defaults to the built-in Handlebars adapter. */
	adapter?: TemplateAdapter;
	/** File extension for template files (default: ".hbs") */
	extension?: string;
	/** Cache template source in memory (default: true). Set to false during development. */
	cache?: boolean;
}

export class ViewEngine {
	private readonly viewsDir: string;
	private readonly extension: string;
	private readonly adapter: TemplateAdapter | undefined;
	private readonly useCache: boolean;
	private readonly sourceCache = new Map<string, string>();
	private defaultAdapter: TemplateAdapter | undefined;

	constructor(config: ViewEngineConfig) {
		this.viewsDir = config.viewsDir;
		this.extension = config.extension ?? ".hbs";
		this.adapter = config.adapter;
		this.useCache = config.cache ?? true;
	}

	private async getAdapter(): Promise<TemplateAdapter> {
		if (this.adapter) {
			return this.adapter;
		}

		if (!this.defaultAdapter) {
			// Default to the built-in Handlebars adapter
			const { HandlebarsAdapter } = await import("./adapters/handlebars.js");
			this.defaultAdapter = new HandlebarsAdapter();
		}

		return this.defaultAdapter as TemplateAdapter;
	}

	async render(templateName: string, context: object): Promise<string> {
		const ext = templateName.includes(".") ? "" : this.extension;
		const filePath = path.join(this.viewsDir, templateName + ext);

		let source = this.useCache ? this.sourceCache.get(filePath) : undefined;

		if (source === undefined) {
			const file = Bun.file(filePath);
			if (!await file.exists()) {
				throw new Error(`Template not found: ${filePath}`);
			}
			source = await file.text();
			if (this.useCache) {
				this.sourceCache.set(filePath, source);
			}
		}

		const adapter = await this.getAdapter();
		return adapter.render(source, context);
	}
}
