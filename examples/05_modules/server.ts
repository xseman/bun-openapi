import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { AppModule } from "./app.module.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	imports: [AppModule],
	swagger: true,
	openapi: {
		service: {
			name: "modules",
			version: "1.0.0",
			description: "@Module with providers/exports, module encapsulation, and buildModuleTree. Builds on dependency-injection.",
		},
	},
});

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
]);
