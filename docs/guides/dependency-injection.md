# Dependency Injection

[Docs Home](../index.md) | [Previous: Response Validation](response-validation.md) | [Next: Modules](modules.md)

bun-openapi includes a lightweight DI container with provider tokens, scopes, and visibility enforcement.

## Container Architecture

The container has two scopes that form a parent-child relationship:

```
+--------------------------------------+      createRequestScope()      +----------------------------------+
| Container                            | -----------------------------> | RequestScope                     |
|                                      |                                |                                  |
| providers:  Map<token, factory>      |                                | cache:   Map<token, instance>    |
| singletons: Map<token, instance>     |                                | parent:  Container               |
|                                      |                                |                                  |
| register(provider, visibility)       |                                | resolve(token)                   |
| resolve(token)                       |                                | instantiate(ctor)                |
+--------------------------------------+                                +----------------------------------+
```

A new `RequestScope` is created for every incoming HTTP request. It inherits singleton instances from the parent `Container` and maintains its own cache for request-scoped providers.

## Provider Forms

Register providers in `createApp({ providers })` or inside a `@Module`. Five forms are supported:

| Form            | Usage                                                              |
| --------------- | ------------------------------------------------------------------ |
| Class shorthand | `UserService` — registers the class as its own token               |
| `useClass`      | `{ provide: Token, useClass: UserService }`                        |
| `useValue`      | `{ provide: Token, useValue: value }` — wraps an existing instance |
| `useFactory`    | `{ provide: Token, useFactory: (a, b) => val, inject: [A, B] }`    |
| `useExisting`   | `{ provide: NewToken, useExisting: ExistingToken }` — alias        |

## Provider Tokens

A token can be a **class constructor**, a **string**, or a **symbol**.

```ts
// class token — resolved automatically via reflect-metadata
providers: [UserService];

// string token — requires @Inject("APP_NAME") at the injection site
providers: [{ provide: "APP_NAME", useValue: "My App" }];

// symbol token — requires @Inject(DB_TOKEN) at the injection site
const DB_TOKEN = Symbol("DB");
providers: [{ provide: DB_TOKEN, useValue: db }];
```

## Registering Services

Mark every class you want the container to manage with `@Injectable()`:

```ts
@Injectable()
export class UserService {
	constructor(private readonly db: Database) {}
}
```

Register both the service and its dependencies in `providers`:

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

## Constructor Injection

For **class tokens** (the common case), the container resolves the dependency automatically using `reflect-metadata` — no decorator needed on the parameter:

```ts
@Injectable()
export class OrderService {
	constructor(private readonly userService: UserService) {}
}
```

For **string or symbol tokens**, use `@Inject(token)` on the constructor parameter:

```ts
@Injectable()
export class MailService {
	constructor(@Inject("APP_NAME") private readonly appName: string) {}
}
```

## Field Injection

`@Inject(token)` also works on class fields:

```ts
@Route("/items")
export class ItemsController extends Controller {
	@Inject(UserService)
	userService!: UserService;
	@Inject("APP_NAME")
	appName!: string;
}
```

## Injecting External Instances (ValueProvider)

Use `useValue` to hand an existing object — for example a TypeORM `DataSource` — into the container so services can receive it instead of importing the singleton directly:

```ts
// server.ts
import { DataSource } from "typeorm";
import { AppDataSource } from "./data-source.js";

await AppDataSource.initialize();

const app = createApp({
	providers: [
		UserService,
		{ provide: DataSource, useValue: AppDataSource },
	],
});
```

```ts
// user.service.ts
import { DataSource } from "typeorm";

@Injectable()
export class UserService {
	#repo: Repository<User>;

	constructor(dataSource: DataSource) {
		this.#repo = dataSource.getRepository(User);
	}
}
```

Because `DataSource` is a class token, `reflect-metadata` resolves it without `@Inject`. See examples 11–14 for working implementations of this pattern.

## Factory Provider

Use `useFactory` when the value depends on other providers:

```ts
providers: [
	{ provide: "DB_HOST", useValue: "localhost" },
	{
		provide: "DB_URL",
		useFactory: (host: string) => `postgres://${host}/mydb`,
		inject: ["DB_HOST"],
	},
];
```

## Scopes

| Scope                   | Behaviour                                                            |
| ----------------------- | -------------------------------------------------------------------- |
| `"singleton"` (default) | One instance for the lifetime of the app, shared across all requests |
| `"request"`             | A fresh instance per request, isolated to that request's scope       |

```ts
@Injectable({ scope: "request" })
export class RequestContext { ... }
```

## Resolution Flow

When the container resolves a token, it follows this decision tree:

```
resolve(token, visibleTokens)
|
+-- token not visible? ---------- yes -> error: token not accessible
|
+-- singleton cached? ----------- yes -> return cached instance
|
+-- provider registered? -------- no  -> error: unknown provider token
|
+-- currently resolving? -------- yes -> error: circular dependency
|
`-- call provider.factory(resolver)
      |
      +-- useValue    -> return value directly
      +-- useExisting -> resolve the aliased token
      +-- useFactory  -> resolve inject[] deps, then call factory
      `-- useClass    -> instantiateAndInject()
            |
            +-- read design:paramtypes via reflect-metadata
            +-- for each param:
            |   +-- @Inject(token)? -> use explicit token
            |   `-- otherwise       -> use reflected class type
            +-- resolve each dependency recursively
            +-- new Ctor(...resolvedDeps)
            `-- inject @Inject() decorated fields
```

For **singleton** providers, the resolved instance is cached in the root `Container` after the first resolution. For **request-scoped** providers, the instance is cached in the `RequestScope` and discarded when the request ends.

## Circular Dependency Detection

The container tracks which tokens are currently being resolved. If a token is encountered again during its own resolution chain, a circular dependency error is thrown:

```
Circular dependency detected: UserService → OrderService → UserService
```

Break cycles by using `useFactory` with lazy resolution or restructuring your dependencies.

## Visibility Enforcement

When using [Modules](modules.md), each provider and controller has a visibility set — the tokens it is allowed to resolve. If a controller tries to inject a provider from another module that was not exported, the container throws an error at startup. This enforces module encapsulation.

## Examples

- [04_dependency-injection](https://github.com/xseman/bun-openapi/tree/master/examples/04_dependency-injection/) — service tokens, `@Inject`, value providers
- [11_jwt-auth](https://github.com/xseman/bun-openapi/tree/master/examples/11_jwt-auth/) — `DataSource` ValueProvider, JWT guard as injectable
- [12_form-auth](https://github.com/xseman/bun-openapi/tree/master/examples/12_form-auth/) — `DataSource` ValueProvider, injectable guard
- [13_typeorm-relations](https://github.com/xseman/bun-openapi/tree/master/examples/13_typeorm-relations/) — `DataSource` ValueProvider, multiple repositories from one injected source
- [14_session-auth](https://github.com/xseman/bun-openapi/tree/master/examples/14_session-auth/) — `DataSource` ValueProvider alongside an in-memory `SessionStore`
- [15_request-scope](https://github.com/xseman/bun-openapi/tree/master/examples/15_request-scope/) — `@Injectable({ scope: "request" })` for per-request state isolation
