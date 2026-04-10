# Logging and Caller Context

[Docs Home](../index.md) | [Previous: View Rendering](view-rendering.md) | [Next: Decorator Reference](../reference/decorators.md)

bun-openapi exposes endpoint caller metadata for request-scoped logging.

## getCallerContext

Use getCallerContext() to read:

- className
- methodName

This lets loggers emit labels like ItemController.create without manual string constants.

## Typical Pattern

1. Use middleware to attach request IDs and user/session IDs into AsyncLocalStorage.
2. Use getCallerContext() from services or logger helpers.
3. Emit combined context in one structured log event.

## Why It Helps

- better traceability
- easier metrics labels
- less repetitive logging code

## Example

See [examples/08_logging/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/server.ts), [examples/08_logging/logger.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/logger.ts), and [examples/08_logging/request-context.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/request-context.ts).
