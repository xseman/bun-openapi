# Spec-Only Mode

[Docs Home](../index.md) | [Previous: OpenAPI and Swagger](openapi-and-swagger.md) | [Next: Guards and Security](guards-and-security.md)

Use spec-only mode when you need OpenAPI artifacts without running an HTTP server.

## When To Use It

- CI pipelines that publish OpenAPI documents
- SDK generation jobs
- contract checks in pull requests

## Example

```ts
import { buildSpec } from "bun-openapi";
import { classValidator } from "bun-openapi/adapters/class-validator";
import { UserController } from "./controller";

const spec = buildSpec([UserController], classValidator(), {
	service: {
		name: "users-api",
		version: "1.0.0",
		description: "Users API",
	},
});

await Bun.write("./openapi.json", JSON.stringify(spec, null, 2));
```

## Notes

- Endpoints with @Render are excluded from OpenAPI output.
- Security schemes are configured in the OpenAPI config object.
- You can still use createApp with openapi.filePath when running a server.
