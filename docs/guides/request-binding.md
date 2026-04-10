# Request Binding

[Docs Home](../index.md) | [Previous: Controllers and Routes](controllers-and-routes.md) | [Next: Validation and Schemas](validation-and-schemas.md)

Request binding maps incoming request data — path parameters, query strings, headers, and body — directly to controller method parameters. bun-openapi supports two binding styles: **whole-object** (validated against a schema) and **scalar** (individual named values with type coercion).

## Whole-Object Binding

Pass a schema class to the parameter decorator to validate and bind a complete structure. The incoming data is validated against the schema before your method executes.

```ts
@Get("/:id")
getById(@Param(UserParams) params: UserParams) {
  return { id: params.id };
}

@Get()
list(@Query(ListQuery) query: ListQuery) {
  return { page: query.page ?? 1 };
}

@Post()
create(@Body(CreateUser) body: CreateUser) {
  return body;
}
```

This is the recommended approach when you have complex inputs or want automatic validation. The schema class also drives the OpenAPI parameter/body documentation.

## Scalar Binding

Pass a string name to bind one value at a time. bun-openapi uses reflected TypeScript types to coerce the value automatically — strings stay as-is, `number` parameters are parsed, and `boolean` parameters accept `"true"` / `"false"`.

```ts
@Get("/:id")
read(
  @Param("id") id: number,
  @Query("active") active: boolean,
  @Header("x-region") region?: string,
) {
  return { id, active, region };
}
```

> **TIP**: If the parameter name in your decorator matches the method argument name, the mapping is straightforward. Use scalar binding for simple lookups; switch to whole-object binding when you need validation rules.

## Raw Request Access

Use `@Request()` when you need direct access to the Bun `Request` object — for example, to read cookies, check the URL, or access streaming bodies.

```ts
@Get("/me")
whoAmI(@Request() request: Request) {
  return { userAgent: request.headers.get("user-agent") };
}
```

## Parameter Decorator Summary

| Decorator         | Source          | Typical use                      |
| ----------------- | --------------- | -------------------------------- |
| `@Param(schema)`  | Path params     | Validated path parameter object  |
| `@Param("name")`  | Path params     | Single path parameter            |
| `@Query(schema)`  | Query string    | Validated query parameter object |
| `@Query("name")`  | Query string    | Single query value               |
| `@Header(schema)` | Request headers | Validated headers object         |
| `@Header("name")` | Request headers | Single header value              |
| `@Body(schema?)`  | Request body    | JSON body with optional schema   |
| `@Request()`      | Raw request     | Full Bun `Request` object        |

## Important Rules

- Do not mix scalar and whole-object binding for the same source in one method.
- Only one `@Body` binding is allowed per method.
- Only one `@Request` binding is allowed per method.

> **CAVEAT**: When using scalar `@Param("id")`, the parameter name must match the path segment name in the route decorator (e.g. `@Get("/:id")`).

## Example

See [examples/02_crud/controller.ts](https://github.com/xseman/bun-openapi/blob/master/examples/02_crud/controller.ts).
