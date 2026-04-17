import "reflect-metadata";

import { DataSource } from "typeorm";

import { classValidator } from "../../src/adapters/class-validator.js";
import { createApp } from "../../src/index.js";
import {
	PostsController,
	PublishedController,
	UsersController,
} from "./controllers.js";
import { AppDataSource } from "./data-source.js";
import { UserService } from "./user.service.js";

await AppDataSource.initialize();

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	docs: { swagger: true },
	controllers: [UsersController, PostsController, PublishedController],
	providers: [UserService, { provide: DataSource, useValue: AppDataSource }],
	openapi: {
		service: {
			name: "typeorm-relations",
			version: "1.0.0",
			description: "TypeORM @OneToMany / @ManyToOne relations: nested routes, cascade delete, and cross-relation join queries. Builds on typeorm-auth.",
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
	{ name: "1. Create user", url: `curl -X POST http://localhost:${port}/users -H 'content-type: application/json' -d '{"name":"Alice","email":"alice@example.com"}'` },
	{ name: "2. Create post (replace UID)", url: `curl -X POST http://localhost:${port}/users/UID/posts -H 'content-type: application/json' -d '{"title":"Hello","body":"First post"}'` },
	{ name: "3. Publish post (replace UID, PID)", url: `curl -X PATCH http://localhost:${port}/users/UID/posts/PID -H 'content-type: application/json' -d '{"published":true}'` },
	{ name: "4. Published feed", url: `http://localhost:${port}/posts/published` },
]);
