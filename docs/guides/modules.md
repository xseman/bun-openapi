# Modules

[Docs Home](../index.md) | [Previous: Dependency Injection](dependency-injection.md) | [Next: View Rendering](view-rendering.md)

Modules group controllers and providers with explicit visibility boundaries.

## Module Metadata

- controllers
- providers
- imports
- exports

Only exported providers from a module are visible to importing modules.

## Why Use Modules

- clear feature boundaries
- explicit dependency graph
- safer provider visibility rules

## Circular Imports

resolveModules fails fast when circular module imports are detected.

## Export Validation

If a module exports a token it does not own or re-export from imports, startup fails with an explicit error.

## Bootstrapping

```ts
const app = createApp({
	schema: classValidator(),
	imports: [AppModule],
	swagger: true,
});
```

## Module Viewer

Enable moduleViewer to inspect the graph in-browser. With `imports`, it renders
the module tree. With direct `controllers` and `providers`, it renders those
nodes under an `App` root.

## Example

See [examples/modules/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/modules/server.ts) and [examples/complex/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/complex/server.ts).
