# Concepts Overview

[Docs Home](../index.md) | [Next: Decorator Basics](decorators.md)

Concept pages explain how bun-openapi works before you move to implementation details.

## Core Concepts

- [Decorator Basics](decorators.md) — how decorators drive routing, validation, and OpenAPI generation
- [Request Lifecycle](request-lifecycle.md) — the full execution flow from HTTP request to response

## Architecture at a Glance

```
createApp(config)
|
+-- Module resolution  -> walk @Module import tree, build visibility maps
+-- DI container setup -> register providers with scope and visibility
+-- OpenAPI spec build -> read decorator metadata into OpenAPI 3.0.3
+-- Route registration -> wire controllers to Bun route handlers
`-- Docs endpoints    -> docs.swagger + docs.modules (optional)
```

## Practical Follow-Up

- [Getting Started](../getting-started.md)
- [Controllers and Routes](../guides/controllers-and-routes.md)
- [Request Binding](../guides/request-binding.md)
- [Dependency Injection](../guides/dependency-injection.md)
- [Modules](../guides/modules.md)
