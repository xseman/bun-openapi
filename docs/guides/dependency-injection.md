# Dependency Injection

[Docs Home](../index.md) | [Previous: Response Validation](response-validation.md) | [Next: Modules](modules.md)

bun-openapi includes a lightweight DI container with provider tokens and scopes.

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

## Examples

- [04_dependency-injection](https://github.com/xseman/bun-openapi/tree/master/examples/04_dependency-injection/) — service tokens, `@Inject`, value providers
- [11_jwt-auth](https://github.com/xseman/bun-openapi/tree/master/examples/11_jwt-auth/) — `DataSource` ValueProvider, JWT guard as injectable
- [12_form-auth](https://github.com/xseman/bun-openapi/tree/master/examples/12_form-auth/) — `DataSource` ValueProvider, injectable guard
- [13_typeorm-relations](https://github.com/xseman/bun-openapi/tree/master/examples/13_typeorm-relations/) — `DataSource` ValueProvider, multiple repositories from one injected source
- [14_session-auth](https://github.com/xseman/bun-openapi/tree/master/examples/14_session-auth/) — `DataSource` ValueProvider alongside an in-memory `SessionStore`
