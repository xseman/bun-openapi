# Interceptors

[Docs Home](../index.md) | [Previous: Guards and Security](guards-and-security.md) | [Next: Middleware](middleware.md)

Interceptors wrap controller method execution and can transform input, output, or return early. They run **after** guards and **around** the controller method.

## Interceptor Chain

Interceptors form a dispatch chain. Each interceptor calls `next()` to invoke the next interceptor or the final controller method:

```
After guards pass
      |
      v
+-------------------------------------------+
| Global interceptors                       |
+-------------------------------------------+
      |
      v
+-------------------------------------------+
| Controller interceptors                   |
| @UseInterceptors on the class             |
+-------------------------------------------+
      |
      v
+-------------------------------------------+
| Method interceptors                       |
| @UseInterceptors on the method            |
+-------------------------------------------+
      |
      v
+-------------------------------------------+
| Controller method                         |
+-------------------------------------------+
      |
      v
Return value
      |
      v
Interceptors unwind in reverse order and
each layer can transform the result.
```

## Interceptor Interface

```ts
interface Interceptor {
	intercept(
		context: InterceptorContext,
		next: () => Promise<unknown>,
	): unknown | Promise<unknown>;
}
```

The `context` provides the same fields as `GuardContext` plus the controller instance and handler name. The `next()` function calls the next interceptor in the chain or the controller method.

## Common Uses

- **Response envelopes** — wrap every response in `{ ok: true, data: ... }`
- **Timing and metrics** — measure how long the handler takes
- **Cache short-circuiting** — return cached data without calling the method
- **Output normalization** — transform or filter the return value

## Typical Patterns

### Response Envelope

```ts
class EnvelopeInterceptor {
	async intercept(_context: InterceptorContext, next: () => Promise<unknown>) {
		const value = await next();
		return { ok: true, data: value };
	}
}
```

### Timing

```ts
class TimingInterceptor {
	async intercept(context: InterceptorContext, next: () => Promise<unknown>) {
		const start = performance.now();
		const result = await next();
		const ms = (performance.now() - start).toFixed(2);
		console.log(`${context.className}.${context.handlerName} took ${ms}ms`);
		return result;
	}
}
```

### Cache Short-Circuit

An interceptor can skip the controller method entirely by returning without calling `next()`:

```ts
class CacheInterceptor {
	#cache = new Map<string, unknown>();

	async intercept(context: InterceptorContext, next: () => Promise<unknown>) {
		const key = context.request.url;
		if (this.#cache.has(key)) {
			return this.#cache.get(key);
		}
		const result = await next();
		this.#cache.set(key, result);
		return result;
	}
}
```

## Registering Interceptors

```ts
// Global — wraps all routes
const app = createApp({
	interceptors: [TimingInterceptor],
	// ...
});

// Controller — wraps all methods in this controller
@Route("/items")
@UseInterceptors(EnvelopeInterceptor)
class ItemsController extends Controller { ... }

// Method — wraps a single endpoint
@Get()
@UseInterceptors(CacheInterceptor)
list() { ... }
```

## Response Validation Interaction

If `validateResponse` is enabled, the transformed output from interceptors still needs to match the declared `@Returns` schema for the final status code. Validation runs **after** the full interceptor chain unwinds.

## Example

See [examples/07_interceptors/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/07_interceptors/server.ts).
