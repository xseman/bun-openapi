import type { Server } from "bun";

import { Type } from "@sinclair/typebox";
import {
	IsOptional,
	IsString,
	MinLength,
} from "class-validator";

import {
	describe,
	expect,
	test,
} from "bun:test";
import { classValidator } from "./adapters/class-validator.js";
import { typebox } from "./adapters/typebox.js";
import {
	BadRequestException,
	Body,
	buildSpec,
	type CanActivate,
	type CanActivateSecurity,
	Controller,
	createApp,
	Delete,
	Deprecated,
	Description,
	Get,
	Header,
	Hidden,
	Injectable,
	type Interceptor,
	Module,
	NotFoundException,
	OperationId,
	Param,
	Post,
	Query,
	Returns,
	Route,
	Security,
	Summary,
	Tags,
	UseGuards,
	UseInterceptors,
	ValidateResponse,
} from "./index.js";

// --- Test schemas ---

const UserParams = Type.Object({ id: Type.String() });
const ListQuery = Type.Object({
	page: Type.Optional(Type.Number({ minimum: 1 })),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});
const CreateUser = Type.Object({
	name: Type.String({ minLength: 1 }),
	email: Type.String({ format: "email" }),
});
const User = Type.Object(
	{
		id: Type.String(),
		name: Type.String(),
		email: Type.String(),
	},
	{ $id: "User" },
);
const ErrorResponse = Type.Object(
	{ message: Type.String() },
	{ $id: "Error" },
);

// --- Test controllers ---

@Route("/users")
@Tags("Users")
class UserController extends Controller {
	@Get()
	@Returns(200, Type.Array(User), "List of users")
	list(@Query(ListQuery) _query: typeof ListQuery.static) {
		return [];
	}

	@Get("/:id")
	@Returns(200, User, "The user")
	@Returns(404, ErrorResponse, "Not found")
	getById(@Param(UserParams) _params: typeof UserParams.static) {
		return { id: "1", name: "Test", email: "test@test.com" };
	}

	@Post()
	@Returns(201, User, "Created user")
	@Returns(400, ErrorResponse, "Validation error")
	create(@Body(CreateUser) _body: typeof CreateUser.static) {
		this.setStatus(201);
		return { id: "1", name: "Test", email: "test@test.com" };
	}
}

@Route("/posts")
class PostController extends Controller {
	@Get()
	@Summary("List all posts")
	@Description("Returns a paginated list of posts")
	@Returns(200, Type.Array(Type.Object({ title: Type.String() })), "Posts list")
	list() {
		return [];
	}

	@Delete("/:id")
	@OperationId("deletePost")
	@Deprecated()
	@Returns(204, undefined, "Post deleted")
	remove(@Param(UserParams) _params: typeof UserParams.static) {
		this.setStatus(204);
	}
}

@Route("/internal")
class InternalController extends Controller {
	@Get("/health")
	@Hidden()
	@Returns(200, Type.Object({ status: Type.String() }))
	health() {
		return { status: "ok" };
	}

	@Get("/status")
	@Returns(200, Type.Object({ uptime: Type.Number() }), "Service status")
	status() {
		return { uptime: 123 };
	}
}

@Route("/search")
class ScalarBindingController extends Controller {
	@Get("/:id")
	@Returns(200, Type.Object({ id: Type.Number(), page: Type.Number(), active: Type.Boolean(), token: Type.String() }), "Bound values")
	search(
		@Param("id") id: number,
		@Query("page") page?: number,
		@Query("active") active?: boolean,
		@Header("x-token") token?: string,
	) {
		return {
			id,
			page,
			active,
			token,
		};
	}
}

@Route("/slash")
class TrailingSlashController extends Controller {
	@Get("/")
	@Returns(200, Type.Object({ ok: Type.Boolean() }), "Slash-normalized route")
	list() {
		return { ok: true };
	}
}

@Injectable()
class ViewerProvider {}

// --- Tests ---

describe("OpenAPI spec generation", () => {
	test("generates valid OpenAPI 3.0.3 document", () => {
		const spec = buildSpec([UserController], typebox(), {
			service: { name: "test-api", version: "1.0.0" },
		});

		expect(spec.openapi).toBe("3.0.3");
		expect(spec.info.title).toBe("test-api");
		expect(spec.info.version).toBe("1.0.0");
	});

	test("generates paths from controller routes", () => {
		const spec = buildSpec([UserController], typebox());

		expect(spec.paths).toHaveProperty("/users");
		expect(spec.paths).toHaveProperty("/users/{id}");
		expect(spec.paths["/users"]).toHaveProperty("get");
		expect(spec.paths["/users"]).toHaveProperty("post");
		expect(spec.paths["/users/{id}"]).toHaveProperty("get");
	});

	test("converts path params from :id to {id}", () => {
		const spec = buildSpec([UserController], typebox());
		expect(Object.keys(spec.paths)).toContain("/users/{id}");
		expect(Object.keys(spec.paths)).not.toContain("/users/:id");
	});

	test("includes tags from @Tags decorator", () => {
		const spec = buildSpec([UserController], typebox());

		expect(spec.tags).toBeDefined();
		expect(spec.tags).toContainEqual({ name: "Users" });

		const getUsers = spec.paths["/users"].get!;
		expect(getUsers.tags).toEqual(["Users"]);
	});

	test("generates query parameters from @Query", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users"].get!;

		expect(op.parameters).toBeDefined();
		const pageParam = op.parameters!.find((p: any) => p.name === "page");
		const limitParam = op.parameters!.find((p: any) => p.name === "limit");

		expect(pageParam).toBeDefined();
		expect(pageParam!.in).toBe("query");
		expect(limitParam).toBeDefined();
		expect(limitParam!.in).toBe("query");
	});

	test("generates path parameters from @Param", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users/{id}"].get!;

		expect(op.parameters).toBeDefined();
		const idParam = op.parameters!.find((p: any) => p.name === "id");
		expect(idParam).toBeDefined();
		expect(idParam!.in).toBe("path");
		expect(idParam!.required).toBe(true);
	});

	test("generates request body from @Body", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users"].post!;

		expect(op.requestBody).toBeDefined();
		expect(op.requestBody!.required).toBe(true);
		expect(op.requestBody!.content).toHaveProperty("application/json");

		const schema = op.requestBody!.content["application/json"].schema;
		expect(schema).toHaveProperty("type", "object");
		expect(schema).toHaveProperty("properties");
	});

	test("generates responses from @Returns", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users/{id}"].get!;

		expect(op.responses).toHaveProperty("200");
		expect(op.responses).toHaveProperty("404");
		expect(op.responses["200"].description).toBe("The user");
		expect(op.responses["404"].description).toBe("Not found");
	});

	test("uses $ref for named schemas", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users/{id}"].get!;

		const schema200 = op.responses["200"].content!["application/json"].schema;
		expect(schema200).toEqual({ $ref: "#/components/schemas/User" });

		const schema404 = op.responses["404"].content!["application/json"].schema;
		expect(schema404).toEqual({ $ref: "#/components/schemas/Error" });
	});

	test("registers named schemas in components", () => {
		const spec = buildSpec([UserController], typebox());

		expect(spec.components).toBeDefined();
		expect(spec.components!.schemas).toBeDefined();
		expect(spec.components!.schemas).toHaveProperty("User");
		expect(spec.components!.schemas).toHaveProperty("Error");

		const userSchema = spec.components!.schemas!["User"];
		expect(userSchema).toHaveProperty("type", "object");
		expect(userSchema).toHaveProperty("properties");
	});

	test("includes @Summary and @Description", () => {
		const spec = buildSpec([PostController], typebox());
		const op = spec.paths["/posts"].get!;

		expect(op.summary).toBe("List all posts");
		expect(op.description).toBe("Returns a paginated list of posts");
	});

	test("includes @OperationId", () => {
		const spec = buildSpec([PostController], typebox());
		const op = spec.paths["/posts/{id}"].delete!;

		expect(op.operationId).toBe("deletePost");
	});

	test("includes @Deprecated", () => {
		const spec = buildSpec([PostController], typebox());
		const op = spec.paths["/posts/{id}"].delete!;

		expect(op.deprecated).toBe(true);
	});

	test("excludes @Hidden methods from spec", () => {
		const spec = buildSpec([InternalController], typebox());

		// /internal/health is hidden, should not appear
		expect(spec.paths).not.toHaveProperty("/internal/health");
		// /internal/status is not hidden, should appear
		expect(spec.paths).toHaveProperty("/internal/status");
	});

	test("merges multiple controllers", () => {
		const spec = buildSpec([UserController, PostController], typebox());

		expect(spec.paths).toHaveProperty("/users");
		expect(spec.paths).toHaveProperty("/users/{id}");
		expect(spec.paths).toHaveProperty("/posts");
		expect(spec.paths).toHaveProperty("/posts/{id}");
	});

	test("supports default response when no @Returns", () => {
		@Route("/bare")
		class BareController extends Controller {
			@Get()
			handle() {
				return { ok: true };
			}
		}

		const spec = buildSpec([BareController], typebox());
		const op = spec.paths["/bare"].get!;
		expect(op.responses).toHaveProperty("200");
		expect(op.responses["200"].description).toBe("Success");
	});

	test("handles service description in info", () => {
		const spec = buildSpec([UserController], typebox(), {
			service: {
				name: "my-api",
				version: "2.0.0",
				description: "A test API",
			},
		});

		expect(spec.info.title).toBe("my-api");
		expect(spec.info.version).toBe("2.0.0");
		expect(spec.info.description).toBe("A test API");
	});

	test("includes security schemes in components", () => {
		const spec = buildSpec([UserController], typebox(), {
			service: { name: "api", version: "1.0.0" },
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		});

		expect(spec.components!.securitySchemes).toBeDefined();
		expect(spec.components!.securitySchemes!.bearerAuth).toEqual({
			type: "http",
			scheme: "bearer",
			bearerFormat: "JWT",
		});
	});

	test("handles array response schemas", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users"].get!;

		const schema = op.responses["200"].content!["application/json"].schema;
		expect(schema).toHaveProperty("type", "array");
		expect(schema).toHaveProperty("items");
	});

	test("handles response with no schema (e.g. 204)", () => {
		const spec = buildSpec([PostController], typebox());
		const op = spec.paths["/posts/{id}"].delete!;

		expect(op.responses).toHaveProperty("204");
		expect(op.responses["204"].description).toBe("Post deleted");
		expect(op.responses["204"].content).toBeUndefined();
	});

	test("generates scalar parameters from parameter decorators without schemas", () => {
		const spec = buildSpec([ScalarBindingController], typebox());
		const op = spec.paths["/search/{id}"].get!;

		expect(op.parameters).toEqual([
			{ name: "id", in: "path", required: true, schema: { type: "number" } },
			{ name: "page", in: "query", required: undefined, schema: { type: "number" } },
			{ name: "active", in: "query", required: undefined, schema: { type: "boolean" } },
			{ name: "x-token", in: "header", required: undefined, schema: { type: "string" } },
		]);
	});

	test('normalizes @Get("/") to the collection path in OpenAPI', () => {
		const spec = buildSpec([TrailingSlashController], typebox());

		expect(spec.paths).toHaveProperty("/slash");
		expect(spec.paths).not.toHaveProperty("/slash/");
	});

	test("decomposes referenced class-validator query and path schemas into parameters", () => {
		class UserParamsDto {
			@IsString()
			id!: string;
		}

		class UserQueryDto {
			@IsOptional()
			@IsString()
			@MinLength(1)
			search?: string;
		}

		@Route("/cv-users")
		class ClassValidatorController extends Controller {
			@Get("/:id")
			handle(
				@Param(UserParamsDto) _params: UserParamsDto,
				@Query(UserQueryDto) _query: UserQueryDto,
			) {
				return null;
			}
		}

		const spec = buildSpec([ClassValidatorController], classValidator());
		const op = spec.paths["/cv-users/{id}"].get!;

		expect(op.parameters).toEqual([
			{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/UserParamsDto/properties/id" } },
			{ name: "search", in: "query", schema: { $ref: "#/components/schemas/UserQueryDto/properties/search" } },
		]);
	});

	test("keeps inline schemas for unnamed parameter objects", () => {
		const spec = buildSpec([UserController], typebox());
		const op = spec.paths["/users"].get!;

		expect(op.parameters).toEqual([
			{ name: "page", in: "query", required: undefined, schema: { minimum: 1, type: "number" } },
			{ name: "limit", in: "query", required: undefined, schema: { minimum: 1, maximum: 100, type: "number" } },
		]);
	});

	test("includes method-level security requirements", () => {
		@Route("/security")
		class SecurityMethodController extends Controller {
			@Get()
			@Security("bearerAuth")
			handle() {
				return { ok: true };
			}
		}

		const spec = buildSpec([SecurityMethodController], typebox());
		expect(spec.paths["/security"].get!.security).toEqual([{ bearerAuth: [] }]);
	});
});

describe("createApp", () => {
	test("returns spec, routes, and fetch", () => {
		const app = createApp({
			schema: typebox(),
			controllers: [UserController],
			openapi: {
				service: { name: "test", version: "1.0.0" },
			},
		});

		expect(app.spec).toBeDefined();
		expect(app.spec.openapi).toBe("3.0.3");
		expect(app.routes).toBeDefined();
		expect(app.fetch).toBeFunction();
	});

	test("creates routes for all controller methods", () => {
		const app = createApp({
			schema: typebox(),
			controllers: [UserController],
		});

		expect(app.routes).toHaveProperty("/users");
		expect(app.routes["/users"]).toHaveProperty("GET");
		expect(app.routes["/users"]).toHaveProperty("POST");
		expect(app.routes).toHaveProperty("/users/:id");
		expect(app.routes["/users/:id"]).toHaveProperty("GET");
	});

	test("registers both canonical and trailing-slash route variants", async () => {
		const app = createApp({
			schema: typebox(),
			controllers: [TrailingSlashController],
		});

		expect(app.routes).toHaveProperty("/slash");
		expect(app.routes).toHaveProperty("/slash/");

		const canonical = await (app.routes["/slash"] as any).GET(new Request("http://localhost/slash"), {} as any);
		const trailing = await (app.routes["/slash/"] as any).GET(new Request("http://localhost/slash/"), {} as any);

		expect(canonical.status).toBe(200);
		expect(trailing.status).toBe(200);
		expect(await canonical.json()).toEqual({ ok: true });
		expect(await trailing.json()).toEqual({ ok: true });
	});

	test("fetch returns 404 for unmatched routes", () => {
		const app = createApp({ schema: typebox(), controllers: [UserController] });
		const response = app.fetch(new Request("http://localhost/unknown"), {} as Server<undefined>);
		expect(response).toBeInstanceOf(Response);
	});

	test("modules viewer registers routes when enabled with imports", () => {
		@Module({ controllers: [UserController] })
		class TestModule {}

		const app = createApp({
			schema: typebox(),
			imports: [TestModule],
			docs: { modules: true },
		});

		expect(app.routes).toHaveProperty("/docs/modules/");
		expect(app.routes["/docs/modules/"]).toHaveProperty("GET");
		expect("/docs/modules/tree.json" in app.routes).toBe(true);
		expect(app.routes["/docs/modules/tree.json"]).toHaveProperty("GET");
		expect("/docs/modules/tree.svg" in app.routes).toBe(true);
		expect(app.routes["/docs/modules/tree.svg"]).toHaveProperty("GET");
		expect(app.routes).toHaveProperty("/docs/");
		expect(app.routes["/docs/"]).toHaveProperty("GET");
	});

	test("swagger registers docs routes with new defaults", () => {
		const app = createApp({
			schema: typebox(),
			controllers: [UserController],
			docs: { swagger: true },
		});

		expect(app.routes).toHaveProperty("/docs/swagger/");
		expect(app.routes["/docs/swagger/"]).toHaveProperty("GET");
		expect("/docs/swagger/openapi.json" in app.routes).toBe(true);
		expect(app.routes["/docs/swagger/openapi.json"]).toHaveProperty("GET");
		expect(app.routes).toHaveProperty("/docs/");
	});

	test("modules viewer uses custom path", () => {
		@Module({ controllers: [UserController] })
		class TestModule2 {}

		const app = createApp({
			schema: typebox(),
			imports: [TestModule2],
			docs: { modules: { path: "/debug/tree", svgPath: "/debug/graph.svg" } },
		});

		expect(app.routes).toHaveProperty("/debug/tree/");
		expect(app.routes["/debug/tree/"]).toHaveProperty("GET");
		expect("/debug/tree/tree.json" in app.routes).toBe(true);
		expect("/debug/graph.svg" in app.routes).toBe(true);
	});

	test("modules viewer can disable svg output", () => {
		@Module({ controllers: [UserController] })
		class TestModule3 {}

		const app = createApp({
			schema: typebox(),
			imports: [TestModule3],
			docs: { modules: { svgPath: false } },
		});

		expect("/docs/modules/tree.svg" in app.routes).toBe(false);
		expect(app.routes).toHaveProperty("/docs/");
	});

	test("modules viewer registers routes for direct app controllers and providers", async () => {
		const app = createApp({
			schema: typebox(),
			controllers: [UserController],
			providers: [ViewerProvider],
			docs: { modules: true },
		});

		expect(app.routes).toHaveProperty("/docs/modules/");
		expect(app.routes["/docs/modules/"]).toHaveProperty("GET");
		expect("/docs/modules/tree.json" in app.routes).toBe(true);

		const response = await (app.routes["/docs/modules/tree.json"] as any).GET(
			new Request("http://localhost/docs/modules/tree.json"),
			{} as Server<undefined>,
		);
		const tree = await response.json();

		expect(tree).toMatchObject({
			name: "App",
			type: "module",
			children: expect.arrayContaining([
				expect.objectContaining({ name: "UserController", type: "controller" }),
				expect.objectContaining({ name: "ViewerProvider", type: "provider" }),
			]),
		});
	});

	test("modules viewer not registered without imports, controllers, or providers", () => {
		const app = createApp({
			schema: typebox(),
			docs: { modules: true },
		});

		expect(app.routes).not.toHaveProperty("/docs/modules/");
	});

	test("docs index is not registered when no docs features are enabled", () => {
		const app = createApp({
			schema: typebox(),
			controllers: [UserController],
		});

		expect(app.routes).not.toHaveProperty("/docs/");
	});

	test("binds scalar parameter decorators and coerces primitive values", async () => {
		const app = createApp({
			schema: typebox(),
			controllers: [ScalarBindingController],
		});

		const handler = (app.routes["/search/:id"] as any).GET;
		const req = new Request("http://localhost/search/42?page=3&active=true", {
			method: "GET",
			headers: { "x-token": "secret" },
		});
		Object.defineProperty(req, "params", {
			value: { id: "42" },
			configurable: true,
		});

		const res = await handler(req, {} as any);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 42, page: 3, active: true, token: "secret" });
	});

	test("returns 400 when scalar query coercion fails", async () => {
		const app = createApp({
			schema: typebox(),
			controllers: [ScalarBindingController],
		});

		const handler = (app.routes["/search/:id"] as any).GET;
		const req = new Request("http://localhost/search/42?page=oops&active=true", {
			method: "GET",
			headers: { "x-token": "secret" },
		});
		Object.defineProperty(req, "params", {
			value: { id: "42" },
			configurable: true,
		});

		const res = await handler(req, {} as any);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			message: "Query validation failed",
			errors: [{ path: "/page", message: 'Query parameter "page" must be a number' }],
		});
	});

	test("maps thrown HttpException subclasses to structured responses", async () => {
		@Route("/exceptions")
		class ExceptionController extends Controller {
			@Get("/missing")
			missing() {
				throw new NotFoundException("User not found");
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [ExceptionController],
		});

		const handler = (app.routes["/exceptions/missing"] as any).GET;
		const res = await handler(new Request("http://localhost/exceptions/missing"), {} as any);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ message: "User not found" });
	});

	test("validates declared responses when validateResponse is enabled", async () => {
		const ResponseSchema = Type.Object({ ok: Type.Boolean() });

		@Route("/validated-response")
		class ValidatedResponseController extends Controller {
			@Get()
			@Returns(200, ResponseSchema, "Validated response")
			handle() {
				return { ok: true };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [ValidatedResponseController],
			validateResponse: true,
		});

		const handler = (app.routes["/validated-response"] as any).GET;
		const res = await handler(new Request("http://localhost/validated-response"), {} as any);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	test("returns 500 when the handler output does not match the declared response schema", async () => {
		const ResponseSchema = Type.Object({ ok: Type.Boolean() });

		@Route("/invalid-response")
		class InvalidResponseController extends Controller {
			@Get()
			@Returns(200, ResponseSchema, "Validated response")
			handle() {
				return { ok: "yes" };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [InvalidResponseController],
			validateResponse: true,
		});

		const handler = (app.routes["/invalid-response"] as any).GET;
		const res = await handler(new Request("http://localhost/invalid-response"), {} as any);
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body).toMatchObject({
			message: "Response validation failed",
			status: 200,
		});
		expect(body.errors).toBeArray();
		expect(body.errors[0]).toMatchObject({ path: "/ok" });
	});

	test("skips response validation when validateResponse is disabled", async () => {
		const ResponseSchema = Type.Object({ ok: Type.Boolean() });

		@Route("/unvalidated-response")
		class UnvalidatedResponseController extends Controller {
			@Get()
			@Returns(200, ResponseSchema, "Declared response")
			handle() {
				return { ok: "yes" };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [UnvalidatedResponseController],
		});

		const handler = (app.routes["/unvalidated-response"] as any).GET;
		const res = await handler(new Request("http://localhost/unvalidated-response"), {} as any);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: "yes" });
	});

	test("can enable response validation per route when the global flag is off", async () => {
		const ResponseSchema = Type.Object({ ok: Type.Boolean() });

		@Route("/route-validated-response")
		class RouteValidatedResponseController extends Controller {
			@Get()
			@ValidateResponse()
			@Returns(200, ResponseSchema, "Validated response")
			handle() {
				return { ok: "yes" };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [RouteValidatedResponseController],
		});

		const handler = (app.routes["/route-validated-response"] as any).GET;
		const res = await handler(new Request("http://localhost/route-validated-response"), {} as any);

		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({ message: "Response validation failed", status: 200 });
	});

	test("can disable response validation per route when the global flag is on", async () => {
		const ResponseSchema = Type.Object({ ok: Type.Boolean() });

		@Route("/route-unvalidated-response")
		class RouteUnvalidatedResponseController extends Controller {
			@Get()
			@ValidateResponse(false)
			@Returns(200, ResponseSchema, "Declared response")
			handle() {
				return { ok: "yes" };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [RouteUnvalidatedResponseController],
			validateResponse: true,
		});

		const handler = (app.routes["/route-unvalidated-response"] as any).GET;
		const res = await handler(new Request("http://localhost/route-unvalidated-response"), {} as any);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: "yes" });
	});

	test("can enable response validation for an entire controller", async () => {
		const ResponseSchema = Type.Object({ ok: Type.Boolean() });

		@Route("/controller-validated-response")
		@ValidateResponse()
		class ControllerValidatedResponseController extends Controller {
			@Get()
			@Returns(200, ResponseSchema, "Validated response")
			handle() {
				return { ok: "yes" };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [ControllerValidatedResponseController],
		});

		const handler = (app.routes["/controller-validated-response"] as any).GET;
		const res = await handler(new Request("http://localhost/controller-validated-response"), {} as any);

		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({ message: "Response validation failed", status: 200 });
	});

	test("applies app-level error formatter to validation failures", async () => {
		const app = createApp({
			schema: typebox(),
			controllers: [ScalarBindingController],
			errorFormatter: (_error, context) => ({
				status: context.status,
				body: {
					error: true,
					status: context.status,
					details: context.body,
				},
			}),
		});

		const handler = (app.routes["/search/:id"] as any).GET;
		const req = new Request("http://localhost/search/42?page=oops&active=true", {
			method: "GET",
			headers: { "x-token": "secret" },
		});
		Object.defineProperty(req, "params", {
			value: { id: "42" },
			configurable: true,
		});

		const res = await handler(req, {} as any);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: true,
			status: 400,
			details: {
				message: "Query validation failed",
				errors: [{ path: "/page", message: 'Query parameter "page" must be a number' }],
			},
		});
	});

	test("applies app-level error formatter to thrown controller exceptions", async () => {
		@Route("/formatted")
		class FormattedController extends Controller {
			@Get("/bad")
			bad() {
				throw new BadRequestException({ message: "Invalid payload", reason: "bad_input" });
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [FormattedController],
			errorFormatter: (_error, context) => ({
				status: context.status,
				headers: { ...context.headers, "x-error": "true" },
				body: {
					ok: false,
					error: context.body,
				},
			}),
		});

		const handler = (app.routes["/formatted/bad"] as any).GET;
		const res = await handler(new Request("http://localhost/formatted/bad"), {} as any);

		expect(res.status).toBe(400);
		expect(res.headers.get("x-error")).toBe("true");
		expect(await res.json()).toEqual({
			ok: false,
			error: { message: "Invalid payload", reason: "bad_input" },
		});
	});

	test("runs guards after middleware and before the handler", async () => {
		const calls: string[] = [];

		function middleware(_req: Request, next: () => Promise<Response>) {
			calls.push("middleware");
			return next();
		}

		@Injectable()
		class ControllerGuard implements CanActivate {
			canActivate() {
				calls.push("controller-guard");
				return true;
			}
		}

		@Injectable()
		class MethodGuard implements CanActivate {
			canActivate() {
				calls.push("method-guard");
				return true;
			}
		}

		@Route("/order")
		@UseGuards(ControllerGuard)
		class OrderedController extends Controller {
			@Get()
			@UseGuards(MethodGuard)
			handle() {
				calls.push("handler");
				return { ok: true };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [OrderedController],
			middlewares: [middleware],
		});

		const handler = (app.routes["/order"] as any).GET;
		const res = await handler(new Request("http://localhost/order"), {} as any);

		expect(res.status).toBe(200);
		expect(calls).toEqual(["middleware", "controller-guard", "method-guard", "handler"]);
	});

	test("runs interceptors around the handler after guards", async () => {
		const calls: string[] = [];

		function middleware(_req: Request, next: () => Promise<Response>) {
			calls.push("middleware");
			return next();
		}

		@Injectable()
		class RouteGuard implements CanActivate {
			canActivate() {
				calls.push("guard");
				return true;
			}
		}

		@Injectable()
		class ControllerInterceptor implements Interceptor {
			async intercept(_context: any, next: () => Promise<unknown>) {
				calls.push("controller-interceptor:before");
				const result = await next();
				calls.push("controller-interceptor:after");
				return result;
			}
		}

		@Injectable()
		class MethodInterceptor implements Interceptor {
			async intercept(_context: any, next: () => Promise<unknown>) {
				calls.push("method-interceptor:before");
				const result = await next();
				calls.push("method-interceptor:after");
				return result;
			}
		}

		@Route("/interceptor-order")
		@UseGuards(RouteGuard)
		@UseInterceptors(ControllerInterceptor)
		class InterceptorOrderController extends Controller {
			@Get()
			@UseInterceptors(MethodInterceptor)
			handle() {
				calls.push("handler");
				return { ok: true };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [InterceptorOrderController],
			middlewares: [middleware],
		});

		const handler = (app.routes["/interceptor-order"] as any).GET;
		const res = await handler(new Request("http://localhost/interceptor-order"), {} as any);

		expect(res.status).toBe(200);
		expect(calls).toEqual([
			"middleware",
			"guard",
			"controller-interceptor:before",
			"method-interceptor:before",
			"handler",
			"method-interceptor:after",
			"controller-interceptor:after",
		]);
	});

	test("allows interceptors to transform handler output", async () => {
		@Injectable()
		class EnvelopeInterceptor implements Interceptor {
			async intercept(_context: any, next: () => Promise<unknown>) {
				return { data: await next() };
			}
		}

		@Route("/interceptor-transform")
		class InterceptorTransformController extends Controller {
			@Get()
			@UseInterceptors(EnvelopeInterceptor)
			handle() {
				return { ok: true };
			}
		}

		const app = createApp({ schema: typebox(), controllers: [InterceptorTransformController] });
		const handler = (app.routes["/interceptor-transform"] as any).GET;
		const res = await handler(new Request("http://localhost/interceptor-transform"), {} as any);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ data: { ok: true } });
	});

	test("allows interceptors to short-circuit with a Response", async () => {
		@Injectable()
		class ShortCircuitInterceptor implements Interceptor {
			intercept() {
				return new Response("cached", { status: 203, headers: { "x-cache": "hit" } });
			}
		}

		@Route("/interceptor-short-circuit")
		class InterceptorShortCircuitController extends Controller {
			@Get()
			@UseInterceptors(ShortCircuitInterceptor)
			handle() {
				return { ok: true };
			}
		}

		const app = createApp({ schema: typebox(), controllers: [InterceptorShortCircuitController] });
		const handler = (app.routes["/interceptor-short-circuit"] as any).GET;
		const res = await handler(new Request("http://localhost/interceptor-short-circuit"), {} as any);

		expect(res.status).toBe(203);
		expect(res.headers.get("x-cache")).toBe("hit");
		expect(await res.text()).toBe("cached");
	});

	test("returns 403 when a guard denies the request", async () => {
		@Injectable()
		class DenyGuard implements CanActivate {
			canActivate() {
				return false;
			}
		}

		@Route("/forbidden")
		class ForbiddenController extends Controller {
			@Get()
			@UseGuards(DenyGuard)
			handle() {
				return { ok: true };
			}
		}

		const app = createApp({ schema: typebox(), controllers: [ForbiddenController] });
		const handler = (app.routes["/forbidden"] as any).GET;
		const res = await handler(new Request("http://localhost/forbidden"), {} as any);

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ message: "Forbidden" });
	});

	test("allows guards to short-circuit with a custom response", async () => {
		@Injectable()
		class ShortCircuitGuard implements CanActivate {
			canActivate() {
				return new Response("blocked", { status: 429, headers: { "retry-after": "60" } });
			}
		}

		@Route("/guard-response")
		class GuardResponseController extends Controller {
			@Get()
			@UseGuards(ShortCircuitGuard)
			handle() {
				return { ok: true };
			}
		}

		const app = createApp({ schema: typebox(), controllers: [GuardResponseController] });
		const handler = (app.routes["/guard-response"] as any).GET;
		const res = await handler(new Request("http://localhost/guard-response"), {} as any);

		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBe("60");
		expect(await res.text()).toBe("blocked");
	});

	test("enforces @Security metadata when matching security guards are configured", async () => {
		@Injectable()
		class BearerTokenGuard implements CanActivateSecurity {
			canActivate({ request }: { request: Request; }) {
				return request.headers.get("authorization") === "Bearer token";
			}
		}

		@Route("/secure")
		@Security("bearerAuth")
		class SecureController extends Controller {
			@Get()
			handle() {
				return { ok: true };
			}
		}

		const app = createApp({
			schema: typebox(),
			controllers: [SecureController],
			securityGuards: {
				bearerAuth: BearerTokenGuard,
			},
		});

		const handler = (app.routes["/secure"] as any).GET;
		const unauthorized = await handler(new Request("http://localhost/secure"), {} as any);
		const authorized = await handler(new Request("http://localhost/secure", { headers: { authorization: "Bearer token" } }), {} as any);

		expect(unauthorized.status).toBe(401);
		expect(await unauthorized.json()).toEqual({ message: "Unauthorized" });
		expect(authorized.status).toBe(200);
		expect(await authorized.json()).toEqual({ ok: true });
	});
});

describe("request decorator constraints", () => {
	test("throws when a method declares more than one body parameter decorator", () => {
		expect(() => {
			class InvalidBodyController extends Controller {
				@Post()
				create(
					@Body(CreateUser) _body: typeof CreateUser.static,
					@Body() _rawBody: unknown,
				) {
					return null;
				}
			}

			return InvalidBodyController;
		}).toThrow("cannot declare more than one body binding");
	});

	test("throws when a method mixes scalar and whole-object path bindings", () => {
		expect(() => {
			class MixedPathBindingController extends Controller {
				@Get("/:id")
				handle(
					@Param(UserParams) _params: typeof UserParams.static,
					@Param("id") _id: string,
				) {
					return null;
				}
			}

			return MixedPathBindingController;
		}).toThrow("cannot mix scalar and whole-object param bindings");
	});

	test("throws when the same parameter has more than one request decorator", () => {
		expect(() => {
			class DuplicateParameterBindingController extends Controller {
				@Get("/:id")
				handle(
					@Param("id")
					@Query("id")
					_value: string,
				) {
					return null;
				}
			}

			return DuplicateParameterBindingController;
		}).toThrow("already has a request decorator on parameter 0");
	});
});
