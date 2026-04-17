import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { OrderController } from "./controller.js";
import { RequestContext } from "./request-context.js";
import { OrderService } from "./service.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [OrderController],
	providers: [
		// Request-scoped: fresh instance per request, isolated state
		RequestContext,
		// Singleton: one instance for the app lifetime
		OrderService,
	],
	docs: { swagger: true },
	openapi: {
		service: {
			name: "request-scope",
			version: "1.0.0",
			description: "Demonstrates @Injectable({ scope: 'request' }) for per-request state isolation. "
				+ "RequestContext is created fresh per request; OrderService is a singleton that "
				+ "receives the request-scoped context. Both the controller and service share "
				+ "the same RequestContext instance within a single request.",
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
	{ name: "List Orders", url: `http://localhost:${port}/orders` },
]);
