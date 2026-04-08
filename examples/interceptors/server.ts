import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { ReportsController } from "./controller.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [ReportsController],
	swagger: true,
	validateResponse: true,
	openapi: {
		service: {
			name: "interceptors-example",
			version: "1.0.0",
			description: "Example demonstrating response-transforming interceptors and Response short-circuiting",
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
	{ name: "Summary", url: `http://localhost:${port}/reports/summary` },
	{ name: "Cached CSV", url: `http://localhost:${port}/reports/export?cached=true` },
]);
