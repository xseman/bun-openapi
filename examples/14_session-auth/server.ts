import "reflect-metadata";

import { DataSource } from "typeorm";
import { classValidator } from "../../src/adapters/class-validator.js";
import { HandlebarsAdapter } from "../../src/adapters/handlebars.js";
import { createApp } from "../../src/index.js";
import {
	AuthController,
	SessionGuard,
} from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AppDataSource } from "./data-source.js";
import { SessionStore } from "./session-store.js";

await AppDataSource.initialize();

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [AuthController],
	providers: [AuthService, SessionStore, SessionGuard, { provide: DataSource, useValue: AppDataSource }],
	viewEngine: {
		viewsDir: new URL("./views", import.meta.url).pathname,
		adapter: new HandlebarsAdapter(),
	},
	openapi: {
		service: {
			name: "session-auth",
			version: "1.0.0",
			description: "Stateful server-side session auth: register, login, protected dashboard, and logout. Session IDs are stored in an in-memory Map and sent as HttpOnly cookies. Contrast with typeorm-auth (stateless JWT) and registration (JWT-in-cookie).",
		},
	},
});

Bun.serve({
	port: port,
	routes: app.routes,
	fetch: app.fetch,
});

console.table([
	{ name: "Server", url: `http://localhost:${port}` },
	{ name: "Register", url: `http://localhost:${port}/register` },
	{ name: "Login", url: `http://localhost:${port}/login` },
	{ name: "Dashboard (protected)", url: `http://localhost:${port}/dashboard` },
]);
