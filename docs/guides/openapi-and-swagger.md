# OpenAPI and Swagger

[Docs Home](../index.md) | [Previous: Error Handling](error-handling.md) | [Next: Spec-Only Mode](spec-only-mode.md)

bun-openapi builds an OpenAPI 3.0.3 document at startup from decorators.

## Minimal Setup

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	docs: { swagger: true },
	openapi: {
		filePath: "./openapi.yaml",
		service: {
			name: "users-api",
			version: "1.0.0",
			description: "Users service",
		},
	},
});
```

## Generated Endpoints

- /docs/ (index)
- /docs/swagger/ (Swagger UI)
- /docs/swagger/openapi.json (raw spec)

## Swagger UI Options

`docs.swagger` accepts the framework's `path` option plus the serializable Swagger UI options that map to `SwaggerUIBundle(...)`.

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	docs: {
		swagger: {
			path: "/swagger",
			deepLinking: true,
			docExpansion: "list",
			operationsSorter: "alpha",
		},
	},
	openapi: {
		service: {
			name: "users-api",
			version: "1.0.0",
		},
	},
});
```

`url` and `dom_id` are managed internally by bun-openapi so the UI always points at the generated spec endpoint.

## Security Schemes

Define schemes in openapi.securitySchemes and apply requirements with @Security.

```ts
openapi: {
  service: { name: "api", version: "1.0.0" },
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
}
```

## Spec-Only Build

If you only need artifacts for CI or SDK generation, use buildSpec directly.

```ts
import { buildSpec } from "bun-openapi";

const spec = buildSpec([UserController], classValidator(), {
	service: { name: "api", version: "1.0.0" },
});
```

## Example

See [examples/02_crud/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/02_crud/server.ts).
