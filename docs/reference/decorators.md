# Decorator Reference

[Docs Home](../index.md) | [Previous: View Rendering](../guides/view-rendering.md) | [Next: createApp Config Reference](create-app-config.md)

This page lists decorators exported from bun-openapi.

## Class Decorators

| Decorator                         | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| @Route(path)                      | Defines controller route prefix            |
| @Tags(...tags)                    | Applies OpenAPI tags to controller methods |
| @Security(name, scopes?)          | Adds default security requirement          |
| @UseGuards(...guards)             | Applies guards to all methods              |
| @UseInterceptors(...interceptors) | Applies interceptors to all methods        |
| @ValidateResponse(enabled?)       | Enables or disables response validation    |
| @Middleware(...fns)               | Applies middleware wrappers to all methods |

## Method Decorators

| Decorator                               | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| @Get(path?)                             | Registers GET route                           |
| @Post(path?)                            | Registers POST route                          |
| @Put(path?)                             | Registers PUT route                           |
| @Patch(path?)                           | Registers PATCH route                         |
| @Delete(path?)                          | Registers DELETE route                        |
| @Summary(text)                          | OpenAPI summary                               |
| @Description(text)                      | OpenAPI description                           |
| @OperationId(id)                        | OpenAPI operationId                           |
| @Deprecated()                           | Marks endpoint deprecated                     |
| @Hidden()                               | Excludes endpoint from OpenAPI                |
| @Returns(status, schema?, description?) | Declares response schema and description      |
| @Produces(contentType)                  | Declares response content type                |
| @UseGuards(...guards)                   | Applies guards at method scope                |
| @UseInterceptors(...interceptors)       | Applies interceptors at method scope          |
| @ValidateResponse(enabled?)             | Overrides response validation at method scope |
| @Security(name, scopes?)                | Overrides or sets method-level security       |
| @Render(templateName)                   | Renders template with view engine             |

## Parameter Decorators

| Decorator       | Purpose                                       |
| --------------- | --------------------------------------------- |
| @Param(schema)  | Bind and validate full path params object     |
| @Param(name)    | Bind scalar path parameter                    |
| @Query(schema)  | Bind and validate full query object           |
| @Query(name)    | Bind scalar query value                       |
| @Header(schema) | Bind and validate full headers object         |
| @Header(name)   | Bind scalar header value                      |
| @Body(schema?)  | Bind request body, optional schema validation |
| @Request()      | Bind raw Request object                       |

## DI and Module Decorators

| Decorator             | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| @Injectable(options?) | Registers class as injectable provider                |
| @Inject(token)        | Injects token into constructor or property            |
| @Module(metadata)     | Declares module controllers/providers/imports/exports |

Source of truth for exports: [src/index.ts](../../src/index.ts).
