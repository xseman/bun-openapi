import "reflect-metadata";

import { DataSource } from "typeorm";

import { classValidator } from "../../src/adapters/class-validator.js";
import { HandlebarsAdapter } from "../../src/adapters/handlebars.js";
import { createApp } from "../../src/index.js";
import {
	CookieAuthGuard,
	RegistrationController,
} from "./controller.js";
import { AppDataSource } from "./data-source.js";
import { UserService } from "./user.service.js";

await AppDataSource.initialize();

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [RegistrationController],
	providers: [UserService, CookieAuthGuard, { provide: DataSource, useValue: AppDataSource }],
	viewEngine: {
		viewsDir: new URL("./views", import.meta.url).pathname,
		adapter: new HandlebarsAdapter(),
	},
	openapi: {
		service: {
			name: "form-auth",
			version: "1.0.0",
			description: "Form-based web auth: registration, login, protected dashboard, and logout using TypeORM, Bun.password, jose JWT, HttpOnly cookies, and Handlebars templates. Builds on typeorm-auth and mvc.",
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
