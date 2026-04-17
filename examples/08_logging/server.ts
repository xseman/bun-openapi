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
	docs: { swagger: true },
	openapi: {
		service: {
			name: "logging",
			version: "1.0.0",
			description: "AsyncLocalStorage request context, getCallerContext, and structured logging with injected Logger. Builds on dependency-injection.",
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
]);
