# Decorator Basics

[Docs Home](../index.md) | [Previous: Getting Started](../getting-started.md) | [Next: Request Lifecycle](request-lifecycle.md)

Decorators are the primary way you configure bun-openapi. Instead of writing separate route registration code and OpenAPI spec files, you annotate your controller classes — and the framework reads that metadata at startup to build:

- **Bun route handlers** with parameter binding and validation.
- **Runtime behavior** — guards, interceptors, and middleware execution order.
- **OpenAPI 3.0 document** with paths, schemas, security, and response descriptions.

This means your TypeScript code is the single source of truth for both the running server and the API documentation.

## Class-Level Decorators

These decorators go on your controller class and affect all methods within it.

| Decorator                 | Effect                                       |
| ------------------------- | -------------------------------------------- |
| `@Route("/prefix")`       | Sets the base path for all endpoints         |
| `@Tags("Users")`          | Applies OpenAPI tags to all methods          |
| `@Security("bearerAuth")` | Adds default security requirement            |
| `@UseGuards(...)`         | Attaches guards to all methods               |
| `@UseInterceptors(...)`   | Attaches interceptors to all methods         |
| `@ValidateResponse(true)` | Enables response validation by default       |
| `@Middleware(...)`        | Adds middleware wrappers at controller scope |

## Method-Level Decorators

These decorators go on individual methods to define endpoints and their behavior.

- **HTTP verbs**: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
- **OpenAPI metadata**: `@Summary`, `@Description`, `@OperationId`, `@Deprecated`, `@Hidden`
- **Response metadata**: `@Returns(status, schema, description)`, `@Produces(contentType)`
- **Runtime behavior**: `@UseGuards`, `@UseInterceptors`, `@ValidateResponse`, `@Render`, `@Security`

> **TIP**: Method-level decorators override class-level ones where it makes sense. For example, `@Security` on a method replaces the controller-level security requirement for that specific endpoint.

## Parameter Decorators

These bind incoming request data to method arguments. They come in two flavors:

- **Whole-object**: pass a schema class for validation — `@Param(UserParams)`, `@Body(CreateUser)`
- **Scalar**: pass a string name for single values — `@Param("id")`, `@Query("page")`

| Decorator         | Source          |
| ----------------- | --------------- |
| `@Param(schema)`  | Path parameters |
| `@Query(schema)`  | Query string    |
| `@Header(schema)` | Request headers |
| `@Body(schema?)`  | Request body    |
| `@Request()`      | Raw `Request`   |

## Mental Model

Think of decorators as defining layers that compose at startup:

```
@Route + @Get/@Post/...       →  1. Route matching
@Param/@Query/@Body/...       →  2. Parameter binding & validation
@UseGuards / @Security        →  3. Guard & security checks
@UseInterceptors              →  4. Interceptor wrapping
                              →  5. Controller method execution
@Returns + @ValidateResponse  →  6. Optional response validation
```

Each layer reads metadata that you declared with decorators. No manual wiring required.

Continue with [Request Lifecycle](request-lifecycle.md) for the exact execution order at runtime.
