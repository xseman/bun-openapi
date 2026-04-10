# Dependency Injection

[Docs Home](../index.md) | [Previous: Response Validation](response-validation.md) | [Next: Modules](modules.md)

bun-openapi includes a lightweight DI container with provider tokens and scopes.

## Provider Forms

- class provider shorthand: UserService
- useClass provider
- useValue provider
- useFactory provider
- useExisting alias provider

## Example Setup

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [UserController],
	providers: [
		UserService,
		{ provide: "APP_NAME", useValue: "DI Example App" },
	],
});
```

## Injection Decorators

- @Injectable marks provider classes.
- @Inject(token) injects specific token values.

## Scopes

- singleton (default)
- request

Use request scope for providers that must be recreated per request.

## Example

See [examples/04_dependency-injection/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/04_dependency-injection/server.ts).
That example can also enable `moduleViewer: true`; because it uses direct
app-level providers instead of `imports`, the viewer renders an `App` root.
