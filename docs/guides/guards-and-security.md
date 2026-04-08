# Guards and Security

[Docs Home](../index.md) | [Previous: Spec-Only Mode](spec-only-mode.md) | [Next: Interceptors](interceptors.md)

Use guards to allow, deny, or short-circuit requests before controller execution.

## Guard Types

- CanActivate for general access control
- CanActivateSecurity for @Security runtime enforcement

## Route or Controller Guards

```ts
@Injectable()
class RequireAdminGuard {
	canActivate({ request }: { request: Request; }) {
		return request.headers.get("x-role") === "admin";
	}
}

@Route("/admin")
@UseGuards(RequireAdminGuard)
class AdminController extends Controller {
	@Get("/stats")
	stats() {
		return { ok: true };
	}
}
```

## Runtime Security Guard For @Security

```ts
@Injectable()
class BearerAuthGuard {
	canActivate({ request }: { request: Request; }) {
		return request.headers.get("authorization") === "Bearer demo-token";
	}
}

const app = createApp({
	schema: classValidator(),
	controllers: [AdminController],
	securityGuards: {
		bearerAuth: BearerAuthGuard,
	},
});
```

## Guard Return Values

- true or undefined: continue
- false: deny with 403
- Response: short-circuit with custom response
- throw error: routed through errorFormatter

## Example

See [examples/guards/server.ts](https://github.com/xseman/bun-openapi/blob/master/examples/guards/server.ts) and [examples/security/controller.ts](https://github.com/xseman/bun-openapi/blob/master/examples/security/controller.ts).
