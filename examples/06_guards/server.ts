import { classValidator } from "../../src/adapters/class-validator.js";
import {
	type CanActivateSecurity,
	createApp,
	Injectable,
} from "../../src/index.js";
import {
	AdminController,
	ProjectController,
} from "./controllers.js";

@Injectable()
class BearerAuthGuard implements CanActivateSecurity {
	canActivate({ request }: { request: Request; }) {
		return request.headers.get("authorization") === "Bearer demo-token";
	}
}

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [ProjectController, AdminController],
	securityGuards: {
		bearerAuth: BearerAuthGuard,
	},
	errorFormatter: (_error, context) => ({
		status: context.status,
		body: {
			ok: false,
			error: context.body,
		},
	}),
	docs: { swagger: true },
	openapi: {
		service: {
			name: "guards",
			version: "1.0.0",
			description: "Guards and security example: bearer auth via securityGuards, class-level @Security, method-level @UseGuards, and all three guard return types (boolean, Response, throw). Builds on crud.",
		},
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "Demo bearer token — use 'Bearer demo-token'",
			},
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
	{ name: "Bearer Token", url: "Bearer demo-token" },
	{ name: "Editor Role Header", url: "x-role: editor" },
	{ name: "Admin Role Header", url: "x-role: admin" },
]);
