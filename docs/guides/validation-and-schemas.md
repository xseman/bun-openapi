# Validation and Schemas

[Docs Home](../index.md) | [Previous: Request Binding](request-binding.md) | [Next: Error Handling](error-handling.md)

bun-openapi uses adapter-based schema support. You bring the validation library, and the adapter converts schema definitions to runtime validation **and** OpenAPI JSON Schema — a single source of truth for both runtime checks and API documentation.

## How It Works

1. You define a schema (a class, a TypeBox type, a Zod schema, etc.).
2. You pass that schema to a parameter decorator like `@Body(CreateUser)`.
3. At startup, the adapter extracts JSON Schema for the OpenAPI spec.
4. At runtime, the adapter validates incoming data against the schema before your handler executes.

If validation fails, the framework returns a 400 response with details about what went wrong.

## Built-in Adapters

| Adapter         | Import                                 | Style                   |
| --------------- | -------------------------------------- | ----------------------- |
| class-validator | `bun-openapi/adapters/class-validator` | Decorator-driven DTOs   |
| TypeBox         | `bun-openapi/adapters/typebox`         | JSON-schema-first types |
| Zod             | `bun-openapi/adapters/zod`             | Function-first schemas  |
| Valibot         | `bun-openapi/adapters/valibot`         | Function-first schemas  |

## Example With class-validator

class-validator uses decorators on class properties to define constraints. This maps naturally to bun-openapi's decorator model.

```ts
import { IsEmail, IsString, MinLength } from "class-validator";

class CreateUser {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;
}

@Post()
create(@Body(CreateUser) body: CreateUser) {
  return body;
}
```

A `POST` with `{ "name": "", "email": "bad" }` would be rejected with a 400 response listing the validation failures.

> **TIP**: class-validator is the default adapter when `schema` is omitted from `createApp()`. Most examples in this documentation use it.

## Adapter Setup

Pass the adapter to `createApp()`:

```ts
import { classValidator } from "bun-openapi/adapters/class-validator";

const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
});
```

## Validation Scope

Validation can apply to:

- **Path parameters** — via `@Param(schema)`
- **Query values** — via `@Query(schema)`
- **Headers** — via `@Header(schema)`
- **Body payloads** — via `@Body(schema)`
- **Response payloads** — when `validateResponse` is enabled (see [Response Validation](response-validation.md))

## Adapter Selection Guidance

| If you prefer...                  | Use             |
| --------------------------------- | --------------- |
| Decorators on DTO classes         | class-validator |
| Type-safe JSON Schema definitions | TypeBox         |
| Composable functional schemas     | Zod or Valibot  |

All adapters produce the same result: runtime validation + OpenAPI JSON Schema output. Choose the one that fits your team's style.

## Example Projects

- [examples/basic/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/basic/server.ts)
- [examples/class-validator/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/class-validator/server.ts)
