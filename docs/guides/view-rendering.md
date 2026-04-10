# View Rendering

[Docs Home](../index.md) | [Previous: Modules](modules.md) | [Next: Logging and Caller Context](logging-and-caller-context.md)

Use @Render to return server-rendered HTML templates from controller methods.

## Requirements

- Configure viewEngine in createApp.
- Use @Render("template-name") on the route method.

## Example

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [HomeController],
	viewEngine: {
		viewsDir: new URL("./views", import.meta.url).pathname,
		adapter: new HandlebarsAdapter(),
	},
});
```

```ts
@Get("/")
@Render("index")
home() {
  return { title: "Home" };
}
```

## Notes

- Default extension is .hbs.
- View routes are excluded from the OpenAPI spec.
- You can disable template source caching in development.

## Example

See [examples/10_mvc/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/10_mvc/server.ts).
