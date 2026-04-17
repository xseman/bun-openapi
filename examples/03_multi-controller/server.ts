import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import {
	HealthController,
	OrderController,
	ProductController,
} from "./controllers.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [ProductController, OrderController, HealthController],
	docs: { swagger: true },
	openapi: {
		service: {
			name: "multi-controller",
			version: "1.0.0",
			description: "Multiple controllers, @OperationId, @Deprecated, @Hidden, and @Produces for CSV responses. Builds on crud.",
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
