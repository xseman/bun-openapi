import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { ItemController } from "./controller.js";
import { Logger } from "./logger.js";
import { requestContextMiddleware } from "./request-context.js";
import { ItemService } from "./service.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [ItemController],
	providers: [Logger, ItemService],
	middlewares: [requestContextMiddleware],
	swagger: true,
	openapi: {
		service: {
			name: "logging-example",
			version: "1.0.0",
			description: "Example showing AsyncLocalStorage request context with automatic endpoint caller tags and optional user/session headers",
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
	{ name: "List Items", url: `http://localhost:${port}/items` },
	{ name: "Create Item", url: `curl -X POST http://localhost:${port}/items -H 'content-type: application/json' -H 'x-user-id: user-123' -H 'x-session-id: sess-456' -d '{\"name\":\"book\"}'` },
]);
