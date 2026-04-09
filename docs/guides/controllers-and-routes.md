# Controllers and Routes

[Docs Home](../index.md) | [Previous: Request Lifecycle](../concepts/request-lifecycle.md) | [Next: Request Binding](request-binding.md)

Controllers are the core building block in bun-openapi. Each controller is a class that extends `Controller` and uses decorators to define its routes. At startup, `createApp()` reads this metadata and builds both Bun route handlers and the OpenAPI specification.

## Basic Pattern

```ts
import {
	Controller,
	Get,
	Post,
	Route,
} from "bun-openapi";

@Route("/projects")
class ProjectController extends Controller {
	@Get()
	list() {
		return [];
	}

	@Post()
	create() {
		this.setStatus(201);
		return { id: "p1" };
	}
}
```

The `@Route("/projects")` decorator sets `/projects` as the base path. `@Get()` and `@Post()` register `GET /projects` and `POST /projects` respectively. The return value is automatically serialized as JSON.

## Path Joining Rules

The final path for each endpoint is constructed by joining the controller prefix with the method path:

| `@Route` | Verb decorator   | Resulting path     |
| -------- | ---------------- | ------------------ |
| `/users` | `@Get()`         | `GET /users`       |
| `/users` | `@Get("/:id")`   | `GET /users/:id`   |
| `/users` | `@Post("/bulk")` | `POST /users/bulk` |

> **TIP**: Path parameters use the `:name` syntax (e.g. `/:id`). These map to `{id}` in the generated OpenAPI spec and can be bound with `@Param("id")` or `@Param(schema)`.

## OpenAPI Metadata

Add method decorators to enrich generated operations:

- `@Summary("...")` — short one-liner shown as endpoint title.
- `@Description("...")` — longer explanation shown when expanded.
- `@OperationId("...")` — stable identifier for SDK generators.
- `@Tags("...")` — groups endpoints in Swagger UI.
- `@Deprecated()` — marks the endpoint as deprecated.
- `@Hidden()` — excludes the endpoint from the OpenAPI spec entirely.

See [Descriptions and Metadata](descriptions-and-metadata.md) for detailed examples.

## Choosing Response Status

By default, successful responses return status 200. Call `this.setStatus(code)` before returning to set a different status:

```ts
@Post()
@Returns(201, Project, "Created")
create(@Body(CreateProject) body: CreateProject) {
	this.setStatus(201);
	return { id: crypto.randomUUID(), ...body };
}
```

## Multiple Controllers

Pass multiple controller classes to `createApp()`. Each controller manages its own route prefix:

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [UserController, ProjectController, HealthController],
});
```

## See Also

- [Descriptions and Metadata](descriptions-and-metadata.md) — making your API docs richer.
- [examples/basic/controller.ts](https://github.com/xseman/bun-openapi/blob/master/examples/basic/controller.ts)
- [examples/multi-controller/controllers.ts](https://github.com/xseman/bun-openapi/blob/master/examples/multi-controller/controllers.ts)
