# Getting Started

[Docs Home](index.md) | [Next: Decorator Basics](concepts/decorators.md)

## Install

Install bun-openapi and one schema adapter.

```sh
bun add bun-openapi class-validator
```

## 1) Create a Controller

```ts
import {
	Body,
	Controller,
	Get,
	Post,
	Returns,
	Route,
	Summary,
} from "bun-openapi";

class CreateUser {
	name!: string;
	email!: string;
}

class User {
	id!: string;
	name!: string;
	email!: string;
}

@Route("/users")
class UserController extends Controller {
	@Get()
	@Summary("List users")
	@Returns(200, [User], "List of users")
	list() {
		return [];
	}

	@Post()
	@Summary("Create user")
	@Returns(201, User, "Created user")
	create(@Body(CreateUser) body: CreateUser) {
		this.setStatus(201);
		return {
			id: crypto.randomUUID(),
			name: body.name,
			email: body.email,
		};
	}
}
```

## 2) Start Bun Server

```ts
import { createApp } from "bun-openapi";
import { classValidator } from "bun-openapi/adapters/class-validator";

const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	swagger: true,
	openapi: {
		service: {
			name: "my-api",
			version: "1.0.0",
		},
	},
});

Bun.serve({
	port: 3000,
	routes: app.routes,
	fetch: app.fetch,
});
```

## 3) Open Generated Docs

- Swagger UI: /docs/swagger/
- OpenAPI JSON: /docs/swagger/openapi.json

## What To Read Next

- [Decorator Basics](concepts/decorators.md)
- [Request Binding](guides/request-binding.md)
- [Validation and Schemas](guides/validation-and-schemas.md)

## Runnable Example

See [examples/basic/server.ts](../examples/basic/server.ts) for a complete working setup.
