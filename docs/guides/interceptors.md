# Interceptors

[Docs Home](../index.md) | [Previous: Guards and Security](guards-and-security.md) | [Next: Middleware](middleware.md)

Interceptors wrap controller execution and can transform responses or return early.

## Common Uses

- response envelopes
- timing and metrics
- cache short-circuiting
- output normalization

## Typical Shape

```ts
class EnvelopeInterceptor {
	async intercept(_context: unknown, next: () => Promise<unknown>) {
		const value = await next();
		return { ok: true, data: value };
	}
}
```

## Registering Interceptors

- Global: createApp({ interceptors: [...] })
- Controller: @UseInterceptors(...)
- Method: @UseInterceptors(...)

## Short-Circuit Pattern

An interceptor may return a Response directly to stop downstream execution.

## Response Validation Interaction

If validateResponse is enabled, transformed output still needs to match the declared @Returns schema for the final status code.

## Example

See [examples/07_interceptors/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/07_interceptors/server.ts).
