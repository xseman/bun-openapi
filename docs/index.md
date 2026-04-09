# bun-openapi Documentation

Decorator-driven OpenAPI 3.0 generation and request validation for [Bun](https://bun.sh/).

bun-openapi is a lightweight framework that lets you define your API with TypeScript decorators and automatically generates a valid OpenAPI 3.0 specification from those definitions. Your controllers and models become the single source of truth — no separate spec files to keep in sync.

## Goal

- TypeScript decorators as the single source of truth for routes, validation, and API documentation.
- A valid OpenAPI 3.0 spec generated at startup from your controllers — no code generation step required.
- Runtime request validation and response validation powered by your choice of schema library.
- Built-in Swagger UI for instant API exploration during development.
- Lightweight DI container, guards, interceptors, and middleware for production patterns.

## Philosophy

- Rely on decorators to express route metadata; use adapters for validation logic.
- Minimize boilerplate — a controller class, a few decorators, and `createApp()` are all you need.
- Stay close to the platform — bun-openapi targets `Bun.serve` directly, no compatibility layers.
- Bring your own validation — class-validator, TypeBox, Zod and Valibot adapters ship out of the box.
- Keep it small — the goal is a bare minimum for efficient API development, not a kitchen-sink framework.

## First Steps

- [Getting Started](getting-started.md)
- [Concepts Overview](concepts/index.md)

## Fundamentals

- [Decorator Basics](concepts/decorators.md)
- [Request Lifecycle](concepts/request-lifecycle.md)
- [Controllers and Routes](guides/controllers-and-routes.md)
- [Request Binding](guides/request-binding.md)
- [Validation and Schemas](guides/validation-and-schemas.md)
- [Error Handling](guides/error-handling.md)

## Techniques

- [Guides Overview](guides/index.md)
- [Interceptors](guides/interceptors.md)
- [Middleware](guides/middleware.md)
- [Dependency Injection](guides/dependency-injection.md)
- [Modules](guides/modules.md)
- [View Rendering](guides/view-rendering.md)
- [Logging and Caller Context](guides/logging-and-caller-context.md)

## Security and Contracts

- [Descriptions and Metadata](guides/descriptions-and-metadata.md)
- [OpenAPI and Swagger](guides/openapi-and-swagger.md)
- [Spec-Only Mode](guides/spec-only-mode.md)
- [Guards and Security](guides/guards-and-security.md)
- [Response Validation](guides/response-validation.md)

## Reference

- [Reference Overview](reference/index.md)
- [Decorator Reference](reference/decorators.md)
- [createApp Config Reference](reference/create-app-config.md)

## Recipes and Operations

- [Examples Index](examples/index.md)
- [Production Checklist](production-checklist.md)
- [Publishing to Static Output](publishing-static.md)
- [FAQ](faq.md)

## Quick Example

```ts
import {
	Controller,
	createApp,
	Get,
	Returns,
	Route,
	Summary,
} from "bun-openapi";
import { classValidator } from "bun-openapi/adapters/class-validator";

class User {
	id!: string;
	name!: string;
}

@Route("/users")
class UserController extends Controller {
	@Get()
	@Summary("List users")
	@Returns(200, [User])
	list() {
		return [];
	}
}

const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	swagger: true,
	openapi: { service: { name: "my-api", version: "1.0.0" } },
});

Bun.serve({ port: 3000, routes: app.routes, fetch: app.fetch });
```

Open `http://localhost:3000/docs/swagger/` to see your generated API docs.
