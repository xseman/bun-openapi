# Response Validation

[Docs Home](../index.md) | [Previous: Middleware](middleware.md) | [Next: Dependency Injection](dependency-injection.md)

Response validation checks handler output against the @Returns schema for the final status code.

## Enable Globally

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [ReportsController],
	validateResponse: true,
});
```

## Declare Response Contracts

```ts
@Get("/summary")
@Returns(200, SummaryDto, "Summary payload")
summary() {
  return { total: 10 };
}
```

## Override Per Scope

- @ValidateResponse(false) on controller
- @ValidateResponse(true/false) on method

Method-level setting overrides controller-level setting, which overrides global createApp config.

## Failure Behavior

Validation mismatch is treated as a server error and flows through errorFormatter.

## Example

See [examples/interceptors/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/interceptors/server.ts).
