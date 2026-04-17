import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { UserController } from "./controller.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	docs: { swagger: true },
	controllers: [UserController],
	errorFormatter: (_error, context) => ({
		status: context.status,
		body: {
			ok: false,
			error: context.body,
		},
	}),
	openapi: {
		service: {
			name: "crud",
			version: "1.0.0",
			description: "Full CRUD API with class-validator DTOs, HTTP exceptions, pagination, search, and a global error formatter. Builds on hello-world.",
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
	{ name: "Error Shape", url: '{"ok":false,"error":{"message":"..."}}' },
]);
