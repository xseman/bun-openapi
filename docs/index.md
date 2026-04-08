# bun-openapi Documentation

Decorator-driven OpenAPI 3.0 generation and request validation for Bun.

This documentation is written as plain Markdown so it can be rendered with Bun.markdown.html and later exported as static HTML under /static.

The structure below follows a Nest-style flow: first steps, fundamentals, techniques, security/contracts, and reference.

## First Steps

- [Getting Started](getting-started.md)
- [Concepts Overview](concepts/index.md)

## Fundamentals

- [Decorator Basics](concepts/decorators.md)
- [Request Lifecycle](concepts/request-lifecycle.md)
- [Controllers and Routes](guides/controllers-and-routes.md)
- [Request Binding](guides/request-binding.md)
- [Validation and Schemas](guides/validation-and-schemas.md)
- [Error Handling](guides/error-handling.md)

## Techniques

- [Guides Overview](guides/index.md)
- [Interceptors](guides/interceptors.md)
- [Middleware](guides/middleware.md)
- [Dependency Injection](guides/dependency-injection.md)
- [Modules](guides/modules.md)
- [View Rendering](guides/view-rendering.md)
- [Logging and Caller Context](guides/logging-and-caller-context.md)

## Security and Contracts

- [OpenAPI and Swagger](guides/openapi-and-swagger.md)
- [Spec-Only Mode](guides/spec-only-mode.md)
- [Guards and Security](guides/guards-and-security.md)
- [Response Validation](guides/response-validation.md)

## Reference

- [Reference Overview](reference/index.md)
- [Decorator Reference](reference/decorators.md)
- [createApp Config Reference](reference/create-app-config.md)

## Recipes and Operations

- [Examples Index](examples/index.md)
- [Production Checklist](production-checklist.md)
- [Publishing to Static Output](publishing-static.md)
- [FAQ](faq.md)
