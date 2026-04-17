import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { AppModule } from "./app.module.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	imports: [AppModule],
	docs: true,
	openapi: {
		service: {
			name: "complex",
			version: "1.0.0",
			description: "Capstone: multi-module composition, cross-module DI, @Middleware, and the module viewer. Combines modules, guards, and logging patterns.",
		},
	},
});

export function rateLimiter(_req: Request, next: () => Promise<Response>) {
	return next();
}

Bun.serve({
	port: port,
	routes: {
		...app.routes,
	},
	fetch: app.fetch,
});

console.table(
	Object.entries(app.routes).map(([path, handlers]) => ({
		path: path,
		methods: Object.keys(handlers).join(", "),
	})),
);

console.table([
	{ name: "Server", url: `http://localhost:${port}` },
	{ name: "Docs Index", url: `http://localhost:${port}/docs/` },
	{ name: "Swagger UI", url: `http://localhost:${port}/docs/swagger/` },
	{ name: "Module Viewer", url: `http://localhost:${port}/docs/modules/` },
	{ name: "Module Viewer SVG", url: `http://localhost:${port}/docs/modules/tree.svg` },
]);
