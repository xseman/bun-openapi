# Modules

[Docs Home](../index.md) | [Previous: Dependency Injection](dependency-injection.md) | [Next: View Rendering](view-rendering.md)

Modules group controllers and providers with explicit visibility boundaries. They enforce encapsulation — a provider not listed in `exports` is invisible outside its module.

## Module Metadata

Define a module with the `@Module()` decorator:

```ts
@Module({
	controllers: [CatController],
	providers: [CatService],
	imports: [DatabaseModule],
	exports: [CatService],
})
class CatModule {}
```

| Field         | Purpose                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| `controllers` | Controller classes owned by this module                                                     |
| `providers`   | Services and other injectables scoped to this module                                        |
| `imports`     | Other modules whose exported providers become visible here                                  |
| `exports`     | Tokens from `providers` (or re-exported from `imports`) made available to importing modules |

## Why Use Modules

- Clear feature boundaries — each module is a self-contained unit
- Explicit dependency graph — imports declare what a module needs
- Safer provider visibility — private providers stay private

## Module Resolution

`resolveModules()` walks the import graph **depth-first**. Here is how a typical module tree resolves:

```
AppModule
|
+-- AuthModule
|   |
|   +-- imports: DatabaseModule
|   +-- providers: AuthService, JwtService
|   +-- controllers: AuthController
|   `-- exports: AuthService
|
+-- UsersModule
|   |
|   +-- imports: DatabaseModule
|   +-- providers: UsersService
|   +-- controllers: UsersController
|   `-- exports: UsersService
|
`-- PostsModule
    |
    +-- imports: UsersModule, DatabaseModule
    +-- providers: PostsService
    +-- controllers: PostsController
    `-- exports: (none)
```

## Provider Visibility

Each module builds a **visibility map** — the set of tokens a controller or provider can resolve. This enforces encapsulation:

```
+-----------------------------------------------------+
| UsersModule visibility                              |
|                                                     |
| Visible:                                            |
| - UsersService      (own provider)                  |
| - DatabaseService   (exported by DatabaseModule)    |
|                                                     |
| Not visible:                                        |
| - AuthService       (belongs to AuthModule)         |
| - JwtService        (not exported by AuthModule)    |
+-----------------------------------------------------+
```

If a controller tries to inject a token that's not in its visibility set, the container throws an error at startup.

## Circular Imports

`resolveModules()` fails fast when circular module imports are detected. The error message includes the import chain so you can identify the cycle:

```
Circular module import detected: AuthModule → UsersModule → AuthModule
```

## Export Validation

If a module exports a token it does not own or re-export from imports, startup fails with an explicit error. This prevents accidental leaking of tokens.

## Bootstrapping

```ts
const app = createApp({
	schema: classValidator(),
	imports: [AppModule],
	docs: { swagger: true },
});
```

When using `imports`, bun-openapi resolves the full module tree, collects all controllers and providers, and wires up the DI container with proper visibility constraints.

## Module Viewer

Enable the module viewer to inspect the graph in-browser. With `imports`, it renders the module tree. With direct `controllers` and `providers`, it renders those nodes under an `App` root.

```ts
const app = createApp({
	schema: classValidator(),
	imports: [AppModule],
	docs: true, // enables both Swagger UI and module viewer
});
```

The module viewer is available at `/docs/modules/` and also provides a tree SVG at `/docs/modules/tree.svg`.

## Example

See [examples/05_modules/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/05_modules/server.ts) (basic module setup) and [examples/09_complex/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/09_complex/server.ts) (multi-module composition with cross-module DI, middleware, and module viewer).
