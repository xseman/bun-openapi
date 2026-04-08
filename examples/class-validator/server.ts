import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { UserController } from "./controller.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	swagger: true,
	openapi: {
		service: {
			name: "class-validator-example",
			version: "1.0.0",
			description: "CRUD example using class-validator DTO classes with bun-openapi",
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
