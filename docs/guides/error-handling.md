# Error Handling

[Docs Home](../index.md) | [Previous: Validation and Schemas](validation-and-schemas.md) | [Next: OpenAPI and Swagger](openapi-and-swagger.md)

When something goes wrong — a validation failure, a missing resource, or an unexpected error — bun-openapi converts the error into a structured HTTP response. You control the response shape through built-in exception classes and an optional global error formatter.

## Built-in Exceptions

bun-openapi ships with typed exception classes for common HTTP error codes. Throw them from controllers, guards, or services and they are automatically converted to JSON responses.

| Exception                       | Status |
| ------------------------------- | ------ |
| `BadRequestException`           | 400    |
| `UnauthorizedException`         | 401    |
| `ForbiddenException`            | 403    |
| `NotFoundException`             | 404    |
| `MethodNotAllowedException`     | 405    |
| `NotAcceptableException`        | 406    |
| `RequestTimeoutException`       | 408    |
| `ConflictException`             | 409    |
| `GoneException`                 | 410    |
| `PreconditionFailedException`   | 412    |
| `PayloadTooLargeException`      | 413    |
| `UnsupportedMediaTypeException` | 415    |
| `UnprocessableEntityException`  | 422    |
| `InternalServerErrorException`  | 500    |
| `NotImplementedException`       | 501    |
| `BadGatewayException`           | 502    |
| `ServiceUnavailableException`   | 503    |
| `GatewayTimeoutException`       | 504    |

All of these extend the base `HttpException` class, which you can also use directly for custom status codes.

## Throwing Exceptions

Throw an exception anywhere in your controller logic. The framework catches it and formats the response.

```ts
@Get("/:id")
getById(@Param(UserParams) params: UserParams) {
  const user = this.findUser(params.id);
  if (!user) {
    throw new NotFoundException("User not found");
  }
  return user;
}
```

The client receives a JSON response with status 404 and the message you provided.

## Validation Errors

When schema validation fails (e.g. a missing required field or an invalid email), bun-openapi automatically returns a 400 response with details about which fields failed. You don't need to catch validation errors manually — the framework handles this before your method is called.

> **TIP**: To customize the shape of validation error responses, use `errorFormatter` (see below).

## Global Error Formatter

Use `errorFormatter` to standardize the response shape for all errors — validation failures, thrown exceptions, and unexpected errors alike.

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	errorFormatter: (_error, context) => ({
		status: context.status,
		body: {
			ok: false,
			error: context.body,
		},
	}),
});
```

With this formatter, a 404 error would return:

```json
{
	"ok": false,
	"error": "User not found"
}
```

## Formatter Input

The formatter receives:

| Property  | Description                                              |
| --------- | -------------------------------------------------------- |
| `request` | The original `Request` object                            |
| `status`  | The HTTP status code                                     |
| `headers` | Response headers                                         |
| `body`    | The error payload (message string or validation details) |

It can return:

- A `Response` object for full control.
- Or `{ status, headers, body }` for the framework to serialize.

## Documenting Error Responses

To make error responses visible in your OpenAPI spec, use `@Returns` to declare them:

```ts
@Get("/:id")
@Returns(200, User, "User found")
@Returns(404, undefined, "User not found")
getUser(@Param("id") id: number) {
	// ...
}
```

See [Descriptions and Metadata](descriptions-and-metadata.md) for more details on response documentation.

## Example

See [examples/02_crud/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/02_crud/server.ts).
