import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import { UserController } from "./controller.js";
import { UserService } from "./service.js";

const port = 3_000;

const app = createApp({
	swagger: true,
	moduleViewer: true,
	schema: classValidator(),
	controllers: [UserController],
	providers: [
		// Class shorthand — singleton by default
		UserService,
		// Value provider — inject a constant
		{ provide: "APP_NAME", useValue: "DI Example App" },
	],
	openapi: {
		service: {
			name: "dependency-injection",
			version: "1.0.0",
			description: "@Injectable services, @Inject value providers, async services, and decorator-toolkit caching. Builds on crud.",
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
	{ name: "Module Viewer", url: `http://localhost:${port}/docs/modules/` },
	{ name: "Seeded Users", url: `http://localhost:${port}/users` },
	{ name: "Cached Lookup", url: `http://localhost:${port}/users/alice` },
]);
