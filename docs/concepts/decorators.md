# Decorator Basics

[Docs Home](../index.md) | [Previous: Getting Started](../getting-started.md) | [Next: Request Lifecycle](request-lifecycle.md)

Decorators define routes, validation, metadata, and runtime behavior. bun-openapi reads decorator metadata at startup and builds:

- Bun route handlers
- runtime validation wiring
- OpenAPI document

## Class-Level Decorators

- @Route("/prefix") sets the base path.
- @Tags("Users") sets OpenAPI tags for all methods.
- @Security("bearerAuth") applies default security requirements.
- @UseGuards(...) attaches guards to all controller methods.
- @UseInterceptors(...) attaches interceptors to all methods.
- @ValidateResponse(true) enables response validation by default.
- @Middleware(...) adds middleware wrappers at controller scope.

## Method-Level Decorators

- HTTP verbs: @Get, @Post, @Put, @Patch, @Delete
- OpenAPI metadata: @Summary, @Description, @OperationId, @Deprecated, @Hidden
- Response metadata: @Returns(status, schema, description), @Produces(contentType)
- Runtime behavior: @UseGuards, @UseInterceptors, @ValidateResponse, @Render

## Parameter Decorators

- @Param(schema) or @Param("id")
- @Query(schema) or @Query("page")
- @Header(schema) or @Header("x-request-id")
- @Body(schema)
- @Request()

## Mental Model

Think in layers:

1. Route matching from @Route + verb decorators.
2. Parameter binding and validation from parameter decorators.
3. Guards and security checks.
4. Interceptor wrapping.
5. Controller execution.
6. Optional response validation.

Continue with [Request Lifecycle](request-lifecycle.md) for exact execution order.
