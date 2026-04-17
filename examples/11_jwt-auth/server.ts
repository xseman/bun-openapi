import "reflect-metadata";

import { DataSource } from "typeorm";

import { classValidator } from "../../src/adapters/class-validator.js";
import {
	type CanActivateSecurity,
	createApp,
	Injectable,
	UnauthorizedException,
} from "../../src/index.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AppDataSource } from "./data-source.js";

@Injectable()
class JwtAuthGuard implements CanActivateSecurity {
	constructor(private readonly authService: AuthService) {}

	async canActivate({ request }: { request: Request; }) {
		const [, token] = request.headers.get("authorization")?.split(" ") ?? [];
		if (!token) {
			throw new UnauthorizedException("Missing bearer token");
		}

		const userId = await this.authService.verifyToken(token);
		if (!userId) {
			throw new UnauthorizedException("Invalid or expired token");
		}

		return true;
	}
}

await AppDataSource.initialize();

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	docs: { swagger: true },
	controllers: [AuthController],
	providers: [AuthService, { provide: DataSource, useValue: AppDataSource }],
	securityGuards: {
		bearerAuth: JwtAuthGuard,
	},
	openapi: {
		service: {
			name: "jwt-auth",
			version: "1.0.0",
			description: "JWT Bearer API auth with TypeORM (better-sqlite3 in-memory), Bun.password hashing, and jose tokens. Builds on guards.",
		},
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "JWT obtained from POST /auth/register or POST /auth/login",
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
	{ name: "Swagger UI", url: `http://localhost:${port}/docs/swagger/` },
	{ name: "1. Register", url: `curl -X POST http://localhost:${port}/auth/register -H 'content-type: application/json' -d '{"email":"user@example.com","password":"password123"}'` },
	{ name: "2. Login", url: `curl -X POST http://localhost:${port}/auth/login -H 'content-type: application/json' -d '{"email":"user@example.com","password":"password123"}'` },
	{ name: "3. Me (replace TOKEN)", url: `curl http://localhost:${port}/auth/me -H 'authorization: Bearer TOKEN'` },
]);
