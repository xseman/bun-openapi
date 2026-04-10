# Descriptions and Metadata

[Docs Home](../index.md) | [Previous: OpenAPI and Swagger](openapi-and-swagger.md) | [Next: Spec-Only Mode](spec-only-mode.md)

A valid OpenAPI spec is useful, but a _well-documented_ spec is what makes your API easy to consume. bun-openapi provides several decorators to enrich the generated documentation without duplicating information.

## Endpoint Summaries and Descriptions

Use `@Summary` for a short one-liner and `@Description` for a longer explanation. Both appear in Swagger UI and the raw OpenAPI spec.

```ts
@Route("/users")
class UserController extends Controller {
	/**
	 * @Summary and @Description become OpenAPI operation metadata.
	 */
	@Get("/:id")
	@Summary("Get user by ID")
	@Description(
		"Retrieves the details of an existing user. "
			+ "Supply the unique user ID and receive the corresponding user details.",
	)
	@Returns(200, User, "User found")
	getUser(@Param("id") id: number) {
		return this.findUser(id);
	}
}
```

In Swagger UI, the **summary** shows as the endpoint title, and the **description** appears when you expand the endpoint.

> **TIP**: Keep summaries under 10 words. Use the description for details, edge cases, and examples.

## Operation IDs

`@OperationId` assigns a stable identifier to each operation. This is valuable for SDK generators that use operation IDs as function names.

```ts
@Get("/:id")
@OperationId("getUserById")
@Summary("Get user by ID")
getUser(@Param("id") id: number) {
	return this.findUser(id);
}
```

Without `@OperationId`, the generated spec omits the field and SDK generators fall back to their own naming heuristics.

## Tags

Tags group endpoints in Swagger UI. Apply `@Tags` at the controller level to tag all methods, or at the method level for overrides.

```ts
@Route("/users")
@Tags("Users")
class UserController extends Controller {
	@Get()
	@Summary("List users")
	list() {
		return [];
	}

	@Post()
	@Summary("Create user")
	@Tags("Users", "Admin")
	create(@Body(CreateUser) body: CreateUser) {
		return body;
	}
}
```

## Deprecating Endpoints

Mark endpoints that should no longer be used with `@Deprecated`. Swagger UI renders them with a strikethrough style.

```ts
@Get("/legacy")
@Deprecated()
@Summary("Legacy user list")
legacyList() {
	return [];
}
```

## Hiding Endpoints from the Spec

Use `@Hidden` to exclude an endpoint from the OpenAPI document entirely. The route still works at runtime — it just won't appear in docs or generated SDKs.

```ts
@Get("/internal/health")
@Hidden()
health() {
	return { ok: true };
}
```

## Response Documentation

`@Returns` documents the response schema and description for a specific status code. This is how consumers know what to expect.

```ts
@Post()
@Summary("Create user")
@Returns(201, User, "User successfully created")
@Returns(409, undefined, "User already exists")
create(@Body(CreateUser) body: CreateUser) {
	this.setStatus(201);
	return body;
}
```

Multiple `@Returns` decorators on one method document different status codes. Error responses that don't have a body schema can pass `undefined`.

## Content Type

Use `@Produces` when a response uses a non-default content type.

```ts
@Get("/report")
@Produces("text/csv")
@Returns(200, undefined, "CSV report")
report() {
	return "id,name\n1,Alice";
}
```

## Putting It All Together

A well-documented endpoint combines several metadata decorators:

```ts
@Route("/users")
@Tags("Users")
class UserController extends Controller {
	@Get("/:id")
	@OperationId("getUserById")
	@Summary("Get user by ID")
	@Description("Retrieves user details. Returns 404 if the user does not exist.")
	@Returns(200, User, "User found")
	@Returns(404, undefined, "User not found")
	getUser(@Param("id") id: number) {
		const user = this.findUser(id);
		if (!user) throw new NotFoundException("User not found");
		return user;
	}
}
```

This produces a rich Swagger UI entry with clear descriptions, typed response schemas, and documented error cases.

## See Also

- [Decorator Reference](../reference/decorators.md) — full list of all decorators.
- [OpenAPI and Swagger](openapi-and-swagger.md) — configuring the spec and Swagger UI.
- [examples/03_multi-controller](https://github.com/xseman/bun-openapi/blob/master/examples/03_multi-controller/) — example using metadata decorators.
