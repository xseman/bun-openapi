# Error Handling

[Docs Home](../index.md) | [Previous: Validation and Schemas](validation-and-schemas.md) | [Next: OpenAPI and Swagger](openapi-and-swagger.md)

Errors from validation and controller logic are turned into HTTP responses.

## Built-in Exceptions

- HttpException
- BadRequestException (400)
- UnauthorizedException (401)
- ForbiddenException (403)
- NotFoundException (404)
- MethodNotAllowedException (405)
- NotAcceptableException (406)
- RequestTimeoutException (408)
- ConflictException (409)
- GoneException (410)
- PreconditionFailedException (412)
- PayloadTooLargeException (413)
- UnsupportedMediaTypeException (415)
- UnprocessableEntityException (422)
- InternalServerErrorException (500)
- NotImplementedException (501)
- BadGatewayException (502)
- ServiceUnavailableException (503)
- GatewayTimeoutException (504)

## Throwing Exceptions

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

## Global Error Formatter

Use errorFormatter to standardize response shape.

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

## Formatter Input

The formatter receives:

- request
- status
- headers
- body

It can return:

- a Response object
- or { status, headers, body }

## Example

See [examples/basic/server.ts](../../examples/basic/server.ts).
