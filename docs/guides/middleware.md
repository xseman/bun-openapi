# Middleware

[Docs Home](../index.md) | [Previous: Interceptors](interceptors.md) | [Next: Response Validation](response-validation.md)

Middleware functions wrap route handling and are useful for request-scoped context and cross-cutting behavior. They are the **outermost** layer in the request pipeline — they execute before guards, interceptors, and controller methods.

## Middleware Signature

```ts
type MiddlewareFunction = (
	request: Request,
	next: () => Promise<Response>,
) => Response | Promise<Response>;
```

Each middleware receives the `Request` and a `next()` function. Call `next()` to continue to the next middleware or the guard/interceptor/method chain. Return a `Response` directly to short-circuit.

## Where Middleware Sits in the Pipeline

```
Request
  |
  v
+-------------------------------------------+
| Global middleware                         |
+-------------------------------------------+
  |
  v
+-------------------------------------------+
| Controller middleware                     |
+-------------------------------------------+
  |
  v
+-------------------------------------------+
| Method middleware                         |
+-------------------------------------------+
  |
  v
+-------------------------------------------+
| Guards -> Interceptors -> Method          |
+-------------------------------------------+
  |
  v
Response
```

Middleware wraps **everything** — including guards, interceptors, and the controller method. This makes middleware the right place for:

- Request ID setup (before guards need it)
- User context extraction
- Request timing (measures the full pipeline)
- Logging

## Registration Levels

```ts
// Global — applied to all routes
const app = createApp({
	middlewares: [corsMiddleware, requestIdMiddleware],
	// ...
});

// Controller — applied to all methods in this controller
@Route("/posts")
@Middleware(rateLimiter)
class PostsController extends Controller { ... }

// Method — applied to a single endpoint
@Post()
@Middleware(validateOwnership)
create(@Body(CreatePost) body: CreatePost) { ... }
```

## Execution Order

When multiple middleware are registered at different levels, they execute in this order:

```
Global middleware (array order)
  |
  v
Controller middleware (decorator order)
  |
  v
Method middleware (decorator order)
  |
  v
Guards -> Interceptors -> Method
```

Each level wraps the next. The first global middleware is the outermost wrapper; the last method middleware is the innermost before guards execute.

## Short-Circuiting

A middleware can return a `Response` without calling `next()` to skip all downstream processing:

```ts
function maintenanceMode(request: Request, next: () => Promise<Response>) {
	if (isUnderMaintenance()) {
		return new Response("Service unavailable", { status: 503 });
	}
	return next();
}
```

## Example

See [examples/08_logging/request-context.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/request-context.ts) and [examples/08_logging/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/server.ts).
