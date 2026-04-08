# Request Binding

[Docs Home](../index.md) | [Previous: Controllers and Routes](controllers-and-routes.md) | [Next: Validation and Schemas](validation-and-schemas.md)

Request binding maps incoming request data to handler parameters.

## Whole-Object Binding

Use schemas to validate and bind complete structures.

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

## Scalar Binding

Bind one value at a time and rely on reflected primitive types for coercion.

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

## Raw Request Access

Use @Request() when you need direct access to the Bun Request object.

```ts
@Get("/me")
whoAmI(@Request() request: Request) {
  return { userAgent: request.headers.get("user-agent") };
}
```

## Important Rules

- Do not mix scalar and whole-object binding for the same source in one method.
- Only one @Body binding is allowed.
- Only one @Request binding is allowed.

## Example

See [examples/basic/controller.ts](https://github.com/xseman/bun-openapi/blob/master/examples/basic/controller.ts).
