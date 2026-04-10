# Middleware

[Docs Home](../index.md) | [Previous: Interceptors](interceptors.md) | [Next: Response Validation](response-validation.md)

Middleware functions wrap route handling and are useful for request-scoped context and cross-cutting behavior.

## Middleware Signature

```ts
type MiddlewareFunction = (
	request: Request,
	next: () => Promise<Response>,
) => Response | Promise<Response>;
```

## Registration Levels

- Global: createApp({ middlewares: [...] })
- Controller: @Middleware(...)
- Method: @Middleware(...)

## Typical Use Cases

- request ID setup
- user context extraction
- request logging
- timing and tracing

## Ordering

Middleware wraps the route before guards, interceptors, and controller execution. Use this for request context that other layers should consume.

## Example

See [examples/08_logging/request-context.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/request-context.ts) and [examples/08_logging/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/server.ts).
