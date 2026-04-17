# Guards and Security

[Docs Home](../index.md) | [Previous: Spec-Only Mode](spec-only-mode.md) | [Next: Interceptors](interceptors.md)

Use guards to allow, deny, or short-circuit requests before controller execution. Guards run **after** middleware and **before** interceptors.

## Guard Execution Flow

```
After middleware
      |
      v
+-------------------------------------------+
| Global guards                             |
| array order from createApp                |
+-------------------------------------------+
      |
      v
+-------------------------------------------+
| Controller guards                         |
| @UseGuards on the class                   |
+-------------------------------------------+
      |
      v
+-------------------------------------------+
| Method guards                             |
| @UseGuards on the method                  |
+-------------------------------------------+
      |
      v
+-------------------------------------------+
| Security guards                           |
| applied for @Security routes              |
+-------------------------------------------+
      |
      +--> false    -> 403 Forbidden
      +--> Response -> short-circuit
      +--> throw    -> errorFormatter
      |
      v
Continue to interceptors
```

Guards are evaluated sequentially. If any guard denies access, the remaining guards and the controller method are skipped.

## Guard Types

### CanActivate — General Access Control

```ts
@Injectable()
class RequireAdminGuard {
	canActivate({ request }: GuardContext) {
		return request.headers.get("x-role") === "admin";
	}
}
```

### CanActivateSecurity — Runtime Enforcement for @Security

Security guards receive additional context about the security scheme and required scopes:

```ts
@Injectable()
class BearerAuthGuard {
	canActivate({ request, scheme, scopes }: SecurityGuardContext) {
		const token = request.headers.get("authorization")?.replace("Bearer ", "");
		if (!token) return false;
		// verify token and check scopes...
		return true;
	}
}
```

## Guard Context

Every guard receives a context object with request details:

```
+---------------------------------------------------------------+
| GuardContext                                                  |
|                                                               |
| request:    Request                               raw request  |
| params:     Record<string, string>                path params  |
| query:      Record<string, string | string[]>     query data   |
| headers:    Record<string, string | undefined>    headers      |
| body:       unknown                               parsed body  |
| className:  string                                controller   |
| methodName: string                                handler      |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
| SecurityGuardContext extends GuardContext                     |
|                                                               |
| scheme: string     security scheme name, e.g. bearerAuth      |
| scopes: string[]   required scopes from @Security             |
+---------------------------------------------------------------+
```

## Applying Guards

```ts
// Route or Controller level — guard all methods
@Route("/admin")
@UseGuards(RequireAdminGuard)
class AdminController extends Controller {
	@Get("/stats")
	stats() { return { ok: true }; }
}

// Method level — guard a single endpoint
@Route("/items")
class ItemsController extends Controller {
	@Delete("/:id")
	@UseGuards(RequireAdminGuard)
	remove(@Param("id") id: string) { ... }
}

// Global level — guard every route in the app
const app = createApp({
	guards: [RateLimitGuard],
	// ...
});
```

## Runtime Security Guard Mapping

Map `@Security` scheme names to guard classes in `createApp`:

```ts
const app = createApp({
	schema: classValidator(),
	controllers: [AdminController],
	securityGuards: {
		bearerAuth: BearerAuthGuard,
	},
});
```

When a route has `@Security("bearerAuth")`, the framework instantiates `BearerAuthGuard` in the request scope and calls `canActivate()` with the scheme name and scopes.

## Guard Return Values

| Return                | Effect                                  |
| --------------------- | --------------------------------------- |
| `true` or `undefined` | Continue to next guard or controller    |
| `false`               | Deny with 403 Forbidden                 |
| `Response`            | Short-circuit with that custom response |
| `throw`               | Error flows through `errorFormatter`    |

## Example

See [examples/06_guards/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/06_guards/server.ts) and [examples/06_guards/controllers.ts](https://github.com/xseman/bun-openapi/blob/master/examples/06_guards/controllers.ts).
