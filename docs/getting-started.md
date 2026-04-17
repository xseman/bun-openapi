# Getting Started

[Docs Home](index.md) | [Next: Decorator Basics](concepts/decorators.md)

This guide walks you through building a small Users API with bun-openapi. By the end you will have a running Bun server with automatic request validation, a generated OpenAPI 3.0 spec, and live Swagger UI.

> **Prerequisites**: [Bun](https://bun.sh/) >= 1.0 installed.

## Install

Install bun-openapi and one schema adapter. This guide uses `class-validator`, but you can swap it for TypeBox, Zod, or Valibot later.

```sh
bun add bun-openapi class-validator
```

## 1) Define a Model

Start by defining the data shapes your API will use. These classes serve double duty — they are TypeScript types for your code **and** the source for OpenAPI schema definitions.

```ts
import {
	IsEmail,
	IsString,
	MinLength,
} from "class-validator";

class CreateUser {
	@IsString()
	@MinLength(1)
	name!: string;

	@IsEmail()
	email!: string;
}

class User {
	id!: string;
	name!: string;
	email!: string;
}
```

> **TIP**: With `class-validator`, you can add validation constraints directly on the DTO fields. These constraints are enforced at runtime and also appear in the generated OpenAPI spec.

## 2) Create a Controller

Controllers define your routes. The `@Route` decorator sets the base path, and HTTP-verb decorators (`@Get`, `@Post`, ...) register individual endpoints. Parameter decorators like `@Body` bind and validate incoming data automatically.

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

Let's break down what's happening:

- `@Route("/users")` sets `/users` as the base path for all methods in this class.
- `@Get()` combined with the base route creates a `GET /users` endpoint.
- `@Post()` creates `POST /users`.
- `@Summary(...)` becomes the endpoint summary in generated OpenAPI docs.
- `@Returns(201, User, ...)` tells bun-openapi what the success response looks like — both for documentation and optional response validation.
- `@Body(CreateUser)` validates the incoming JSON body against the `CreateUser` schema before the method executes.

> **TIP**: If validation fails (e.g. a missing `name` field), the framework automatically returns a 400 error with details. You don't need to write any validation logic yourself.

## 3) Start the Server

Wire everything together with `createApp()` and pass the result to `Bun.serve`:

```ts
import { createApp } from "bun-openapi";
import { classValidator } from "bun-openapi/adapters/class-validator";

const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	docs: { swagger: true },
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

`createApp()` does several things at startup:

1. Reads decorator metadata from your controllers.
2. Builds a Bun route map with validation, guards, and interceptors wired in.
3. Generates an OpenAPI 3.0 document from the collected metadata.
4. Optionally serves Swagger UI and the raw spec.

## 4) Open Generated Docs

Start your server and visit:

- **Swagger UI**: [http://localhost:3000/docs/swagger/](http://localhost:3000/docs/swagger/)
- **OpenAPI JSON**: [http://localhost:3000/docs/swagger/openapi.json](http://localhost:3000/docs/swagger/openapi.json)

You should see your `Users` endpoints listed with their request/response schemas — all generated from the decorators you wrote. Try sending a `POST /users` with an invalid body to see validation in action.

## What's Next?

Now that you have a running API, explore deeper topics:

- **[Decorator Basics](concepts/decorators.md)** — understand the full decorator model and how layers compose.
- **[Request Binding](guides/request-binding.md)** — learn about `@Param`, `@Query`, `@Header`, and scalar vs. whole-object binding.
- **[Validation and Schemas](guides/validation-and-schemas.md)** — swap adapters, add constraints, and understand how validation integrates with OpenAPI.
- **[Error Handling](guides/error-handling.md)** — customize error responses with `errorFormatter` and built-in exceptions.
- **[Dependency Injection](guides/dependency-injection.md)** — organize code with providers and service classes.
- **[Guards and Security](guides/guards-and-security.md)** — add authentication and authorization to your endpoints.
- **[Descriptions and Metadata](guides/descriptions-and-metadata.md)** — enrich your OpenAPI docs with summaries, descriptions, and operation IDs.

## Runnable Example

See [examples/02_crud/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/02_crud/server.ts) for a complete working setup.
