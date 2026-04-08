# FAQ

[Docs Home](index.md) | [Previous: Publishing to Static Output](publishing-static.md)

## Why use decorators instead of a route object?

Decorators keep route metadata, validation, and OpenAPI details in one place near each handler.

## Does bun-openapi require Express or Node HTTP middleware?

No. It targets Bun.serve and uses Bun route mapping.

## Can I use my own schema library?

Yes, through the SchemaAdapter interface.

## Why is my @Security decorator visible in OpenAPI but not enforced at runtime?

Because @Security defines OpenAPI requirements. Runtime checks also need securityGuards mapping in createApp.

## Are rendered views included in OpenAPI?

No. Endpoints using @Render are excluded from the generated OpenAPI spec.

## Where do I find complete API type definitions?

See [src/types.ts](https://github.com/xseman/bun-openapi/blob/master/src/types.ts) and [src/index.ts](https://github.com/xseman/bun-openapi/blob/master/src/index.ts).
