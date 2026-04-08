# Controllers and Routes

[Docs Home](../index.md) | [Previous: Request Lifecycle](../concepts/request-lifecycle.md) | [Next: Request Binding](request-binding.md)

Use Controller subclasses with route decorators to define endpoints.

## Basic Pattern

```ts
import {
	Controller,
	Get,
	Post,
	Route,
} from "bun-openapi";

@Route("/projects")
class ProjectController extends Controller {
	@Get()
	list() {
		return [];
	}

	@Post()
	create() {
		this.setStatus(201);
		return { id: "p1" };
	}
}
```

## Path Joining Rules

- Controller prefix comes from @Route.
- Method path comes from verb decorator argument.
- Trailing slash aliases are handled for registered routes.

## OpenAPI Metadata

Add method decorators to enrich generated operations:

- @Summary
- @Description
- @OperationId
- @Tags
- @Deprecated
- @Hidden

## Choosing Response Status

Call this.setStatus(code) before returning to set a non-default status.

## See Also

- [examples/basic/controller.ts](https://github.com/xseman/bun-openapi/blob/master/examples/basic/controller.ts)
- [examples/multi-controller/controllers.ts](https://github.com/xseman/bun-openapi/blob/master/examples/multi-controller/controllers.ts)
