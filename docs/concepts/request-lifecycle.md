# Request Lifecycle

[Docs Home](../index.md) | [Previous: Decorator Basics](decorators.md) | [Next: Controllers and Routes](../guides/controllers-and-routes.md)

This is the practical execution flow inside createApp route handlers.

## Execution Order

1. Route match by path and HTTP method.
2. Request data parsing and binding:
   - params
   - query
   - headers
   - body
3. Schema validation and scalar coercion.
4. Guard execution:
   - global guards
   - controller guards
   - method guards
   - security guards for @Security routes
5. Interceptor chain:
   - global interceptors
   - controller interceptors
   - method interceptors
6. Controller method execution.
7. Optional response validation against @Returns.
8. Final response formatting.

## Error Flow

Any error from validation, guards, interceptors, or controller methods is normalized into an HTTP response. You can customize this with errorFormatter in createApp.

## Caller Context

bun-openapi stores endpoint metadata in async local storage:

- className
- methodName

Use getCallerContext() in logging and metrics helpers to label output without manually passing method names.

Example usage is available in [examples/logging/server.ts](../../examples/logging/server.ts).
