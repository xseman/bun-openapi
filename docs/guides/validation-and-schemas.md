# Validation and Schemas

[Docs Home](../index.md) | [Previous: Request Binding](request-binding.md) | [Next: Error Handling](error-handling.md)

bun-openapi uses adapter-based schema support. You bring the validation library, and the adapter converts schema definitions to runtime validation plus OpenAPI JSON Schema.

## Built-in Adapters

- class-validator
- TypeBox
- Zod
- Valibot

## Example With class-validator

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

## Adapter Setup

```ts
import { classValidator } from "bun-openapi/adapters/class-validator";

const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
});
```

## Validation Scope

Validation can apply to:

- path parameters
- query values
- headers
- body payloads
- optional response payloads (when enabled)

## Adapter Selection Guidance

- Use class-validator for decorator-driven DTO workflows.
- Use TypeBox for strongly typed JSON-schema-first APIs.
- Use Zod or Valibot for function-first schema composition.

## Example Projects

- [examples/basic/server.ts](../../examples/basic/server.ts)
- [examples/class-validator/server.ts](../../examples/class-validator/server.ts)
