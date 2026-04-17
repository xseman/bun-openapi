# Request Lifecycle

[Docs Home](../index.md) | [Previous: Decorator Basics](decorators.md) | [Next: Controllers and Routes](../guides/controllers-and-routes.md)

This page describes the exact execution flow when an HTTP request hits a route handler built by `createApp()`.

## Full Request Flow

```
Incoming HTTP Request
          |
          v
+-------------------------------------------+
| 1. Route matching                         |
|    Bun matches path and HTTP method       |
+-------------------------------------------+
          |
          v
+-------------------------------------------+
| 2. Request parsing and binding            |
|    - path params                          |
|    - query string                         |
|    - headers                              |
|    - body                                 |
+-------------------------------------------+
          |
          v
+-------------------------------------------+
| 3. Schema validation and coercion         |
|    - @Param(schema)                       |
|    - @Query(schema)                       |
|    - @Header(schema)                      |
|    - @Body(schema)                        |
+-------------------------------------------+
          |
          +--> validation failure -> 400 Bad Request
          |
          v
+-------------------------------------------+
| 4. Middleware chain                       |
|    Global -> Controller -> Method         |
+-------------------------------------------+
          |
          v
+-------------------------------------------+
| 5. Guard execution                        |
|    Global -> Controller -> Method         |
|    + security guards from @Security       |
+-------------------------------------------+
          |
          +--> false    -> 403 Forbidden
          +--> Response -> short-circuit
          |
          v
+-------------------------------------------+
| 6. Interceptor chain                      |
|    Global -> Controller -> Method         |
|    Each interceptor wraps next()          |
+-------------------------------------------+
          |
          v
+-------------------------------------------+
| 7. Controller method execution            |
|    - create RequestScope                  |
|    - instantiate controller               |
|    - resolve method arguments             |
|    - call method(...args)                 |
+-------------------------------------------+
          |
          v
+-------------------------------------------+
| 8. Optional response validation           |
|    Validate final output against the      |
|    @Returns schema for the status code    |
+-------------------------------------------+
          |
          +--> mismatch -> 500 Server Error
          |
          v
+-------------------------------------------+
| 9. Response formatting                    |
|    - status and headers                   |
|    - JSON or custom content type          |
|    - @Render -> HTML via ViewEngine       |
+-------------------------------------------+
          |
          v
HTTP Response
```

## How the Layers Nest

Middleware, guards, and interceptors form concentric layers around your controller method. Understanding this nesting is key to writing correct cross-cutting logic:

```
+-----------------------------------------------------+
| Middleware                                          |
| (request, next) => Response                         |
|                                                     |
|  +-----------------------------------------------+  |
|  | Guards                                        |  |
|  | canActivate(ctx)                              |  |
|  |                                               |  |
|  |  +-----------------------------------------+  |  |
|  |  | Interceptors                            |  |  |
|  |  | intercept(ctx, next)                    |  |  |
|  |  |                                         |  |  |
|  |  |  +-----------------------------------+  |  |  |
|  |  |  | Controller method                 |  |  |  |
|  |  |  +-----------------------------------+  |  |  |
|  |  +-----------------------------------------+  |  |
|  +-----------------------------------------------+  |
+-----------------------------------------------------+
```

| Layer            | Interface                              | Purpose                              | Can Short-Circuit?                 |
| ---------------- | -------------------------------------- | ------------------------------------ | ---------------------------------- |
| **Middleware**   | `(request, next) => Response`          | Cross-cutting: logging, CORS, timing | Yes (skip `next()`)                |
| **Guards**       | `canActivate(ctx) => bool \| Response` | Authorization gate                   | Yes (return `false` or `Response`) |
| **Interceptors** | `intercept(ctx, next) => unknown`      | Transform request/response, caching  | Yes (skip `next()`)                |

Within each layer, execution order is: **Global → Controller-level → Method-level**.

## Error Flow

```
Any exception
      |
      v
+-------------------------------------------+
| mapError(error)                           |
+-------------------------------------------+
      |
      +--> HttpException -> status/body/headers
      +--> Error         -> 500 + error.message
      +--> other         -> 500 + Internal Server Error
      |
      v
+-------------------------------------------+
| errorFormatter(error, context)            |
| optional global formatter                 |
+-------------------------------------------+
      |
      v
HTTP response
```

Any error from validation, guards, interceptors, or controller methods is caught and normalized into an HTTP response. Customize the shape with `errorFormatter` in `createApp`.

## Caller Context

bun-openapi stores endpoint metadata in `AsyncLocalStorage` during handler execution:

- `className` — the controller class name
- `methodName` — the handler method name

Use `getCallerContext()` in services or logging helpers to access this without manually passing method names:

```ts
import { getCallerContext } from "bun-openapi";

function log(message: string) {
	const ctx = getCallerContext();
	console.log(`[${ctx?.className}.${ctx?.methodName}] ${message}`);
}
```

Example usage is available in [examples/08_logging/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/08_logging/server.ts).
