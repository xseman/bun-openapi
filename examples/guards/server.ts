import { classValidator } from "../../src/adapters/class-validator.js";
import {
	type CanActivateSecurity,
	createApp,
	Injectable,
} from "../../src/index.js";
import { ProjectController } from "./controller.js";

@Injectable()
class BearerAuthGuard implements CanActivateSecurity {
	canActivate({ request }: { request: Request; }) {
		return request.headers.get("authorization") === "Bearer demo-token";
	}
}

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [ProjectController],
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
	swagger: true,
	openapi: {
		service: {
			name: "guards-example",
			version: "1.0.0",
			description: "Guard and runtime security example using class-validator DTOs in bun-openapi",
		},
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "Demo bearer token authentication",
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
