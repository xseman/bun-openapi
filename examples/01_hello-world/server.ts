import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { HelloController } from "./controller.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	docs: { swagger: true },
	controllers: [HelloController],
	openapi: {
		service: {
			name: "hello-world",
			version: "1.0.0",
			description: "Minimal bun-openapi app: a single GET endpoint with automatic Swagger UI. No DTOs, no validation.",
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

console.table([
	{ name: "Server", url: `http://localhost:${port}` },
	{ name: "GET /", url: `http://localhost:${port}/` },
	{ name: "Swagger UI", url: `http://localhost:${port}/docs/swagger/` },
]);
