# createApp Config Reference

[Docs Home](../index.md) | [Previous: Decorator Reference](decorators.md) | [Next: Examples Index](../examples/index.md)

createApp(config) builds routes, OpenAPI spec, and docs endpoints.

## Required

| Field  | Type          | Description                                            |
| ------ | ------------- | ------------------------------------------------------ |
| schema | SchemaAdapter | Adapter used for validation and JSON Schema conversion |

## Core Runtime

| Field            | Type          |
| ---------------- | ------------- |
| controllers      | class[]       |
| providers        | Provider[]    |
| imports          | ModuleClass[] |
| validateResponse | boolean       |
| errorFormatter   | function      |

## Request Pipeline Extensions

| Field          | Type                                      |
| -------------- | ----------------------------------------- |
| guards         | CanActivate class[]                       |
| interceptors   | Interceptor class[]                       |
| middlewares    | MiddlewareFunction[]                      |
| securityGuards | Record<string, CanActivateSecurity class> |

## OpenAPI and Docs

| Field        | Type                          |
| ------------ | ----------------------------- |
| openapi      | OpenAPIConfig                 |
| swagger      | boolean or SwaggerUIConfig    |
| moduleViewer | boolean or ModuleViewerConfig |

moduleViewer registers docs routes when there are imported modules or direct
app-level controllers/providers to visualize.

## View Rendering

| Field      | Type             |
| ---------- | ---------------- |
| viewEngine | ViewEngineConfig |

## Return Value

createApp returns:

- routes: Bun route map
- fetch: fallback handler
- spec: generated OpenAPI document

See [src/types.ts](https://github.com/xseman/bun-openapi/blob/master/src/types.ts) for complete type definitions.
