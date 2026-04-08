import {
	describe,
	expect,
	test,
} from "bun:test";

import { Type } from "@sinclair/typebox";

import { typebox } from "./adapters/typebox.js";
import { Container } from "./container.js";
import {
	Controller,
	createApp,
	Get,
	Inject,
	Injectable,
	Route,
} from "./index.js";

// --- Test services ---

@Injectable()
class CounterService {
	callCount = 0;
	increment() {
		return ++this.callCount;
	}
}

@Injectable({ scope: "request" })
class RequestIdService {
	readonly id = crypto.randomUUID();
}

// --- Tests ---

describe("Container", () => {
	test("resolves class shorthand provider", () => {
		const container = new Container();
		container.register(CounterService);

		const svc = container.resolve(CounterService) as CounterService;
		expect(svc).toBeInstanceOf(CounterService);
	});

	test("singleton: returns same instance", () => {
		const container = new Container();
		container.register(CounterService);

		const a = container.resolve(CounterService);
		const b = container.resolve(CounterService);
		expect(a).toBe(b);
	});

	test("resolves useValue provider", () => {
		const container = new Container();
		container.register({ provide: "DB_URL", useValue: "postgres://localhost" });

		const val = container.resolve("DB_URL");
		expect(val).toBe("postgres://localhost");
	});

	test("resolves useClass provider", () => {
		const container = new Container();
		container.register({ provide: "counter", useClass: CounterService });

		const svc = container.resolve("counter") as CounterService;
		expect(svc).toBeInstanceOf(CounterService);
	});

	test("resolves useFactory provider", () => {
		const container = new Container();
		container.register({ provide: "DB_URL", useValue: "postgres://localhost" });
		container.register({
			provide: "CONNECTION_STRING",
			useFactory: (url: string) => `${url}/mydb`,
			inject: ["DB_URL"],
		});

		const val = container.resolve("CONNECTION_STRING");
		expect(val).toBe("postgres://localhost/mydb");
	});

	test("resolves useExisting (alias) provider", () => {
		const container = new Container();
		container.register(CounterService);
		container.register({ provide: "Alias", useExisting: CounterService });

		const original = container.resolve(CounterService);
		const alias = container.resolve("Alias");
		expect(alias).toBe(original);
	});

	test("throws on missing provider", () => {
		const container = new Container();
		expect(() => container.resolve("missing")).toThrow("No provider found");
	});

	test("throws on resolving request-scoped from root container", () => {
		const container = new Container();
		container.register(RequestIdService);

		expect(() => container.resolve(RequestIdService)).toThrow("request-scoped");
	});

	test("detects circular dependency", () => {
		const container = new Container();
		container.register({
			provide: "A",
			useFactory: (b: unknown) => ({ b }),
			inject: ["B"],
		});
		container.register({
			provide: "B",
			useFactory: (a: unknown) => ({ a }),
			inject: ["A"],
		});

		expect(() => container.resolve("A")).toThrow("Circular dependency");
	});
});

describe("RequestScope", () => {
	test("resolves request-scoped provider", () => {
		const container = new Container();
		container.register(RequestIdService);

		const scope = container.createRequestScope();
		const svc = scope.resolve(RequestIdService) as RequestIdService;
		expect(svc).toBeInstanceOf(RequestIdService);
		expect(typeof svc.id).toBe("string");
	});

	test("caches request-scoped within same scope", () => {
		const container = new Container();
		container.register(RequestIdService);

		const scope = container.createRequestScope();
		const a = scope.resolve(RequestIdService);
		const b = scope.resolve(RequestIdService);
		expect(a).toBe(b);
	});

	test("different scopes get different request-scoped instances", () => {
		const container = new Container();
		container.register(RequestIdService);

		const scope1 = container.createRequestScope();
		const scope2 = container.createRequestScope();
		const a = scope1.resolve(RequestIdService) as RequestIdService;
		const b = scope2.resolve(RequestIdService) as RequestIdService;
		expect(a).not.toBe(b);
		expect(a.id).not.toBe(b.id);
	});

	test("delegates singleton resolution to parent", () => {
		const container = new Container();
		container.register(CounterService);

		const singleton = container.resolve(CounterService);
		const scope = container.createRequestScope();
		const fromScope = scope.resolve(CounterService);
		expect(fromScope).toBe(singleton);
	});
});

describe("@Inject field decorator", () => {
	test("injects singleton service into controller", () => {
		@Injectable()
		class GreetService {
			greet(name: string) {
				return `Hello, ${name}`;
			}
		}

		@Route("/test")
		class TestController extends Controller {
			@Inject(GreetService)
			greeter!: GreetService;

			@Get()
			handle() {
				return { message: this.greeter.greet("world") };
			}
		}

		const container = new Container();
		container.register(GreetService);

		const instance = container.instantiate(TestController) as TestController;
		expect(instance.greeter).toBeInstanceOf(GreetService);
		expect(instance.greeter.greet("test")).toBe("Hello, test");
	});

	test("injects value provider into controller", () => {
		@Route("/test")
		class TestController extends Controller {
			@Inject("API_KEY")
			apiKey!: string;

			@Get()
			handle() {
				return { key: this.apiKey };
			}
		}

		const container = new Container();
		container.register({ provide: "API_KEY", useValue: "secret-123" });

		const instance = container.instantiate(TestController) as TestController;
		expect(instance.apiKey).toBe("secret-123");
	});
});

describe("constructor injection", () => {
	test("injects class providers into constructor parameters by reflected type", () => {
		@Injectable()
		class GreetService {
			greet(name: string) {
				return `Hello, ${name}`;
			}
		}

		@Injectable()
		class Greeter {
			constructor(readonly greeter: GreetService) {}
		}

		const container = new Container();
		container.register(GreetService);

		const instance = container.instantiate(Greeter) as Greeter;
		expect(instance.greeter).toBeInstanceOf(GreetService);
		expect(instance.greeter.greet("world")).toBe("Hello, world");
	});

	test("injects custom tokens into constructor parameters with @Inject", () => {
		class ConfigConsumer {
			constructor(@Inject("API_KEY") readonly apiKey: string) {}
		}

		const container = new Container();
		container.register({ provide: "API_KEY", useValue: "secret-123" });

		const instance = container.instantiate(ConfigConsumer) as ConfigConsumer;
		expect(instance.apiKey).toBe("secret-123");
	});

	test("throws for non-class constructor parameters without @Inject", () => {
		@Injectable()
		class InvalidConsumer {
			constructor(readonly apiKey: string) {}
		}

		const container = new Container();
		expect(() => container.instantiate(InvalidConsumer)).toThrow("Cannot resolve constructor parameter 0");
	});
});

describe("createApp DI integration", () => {
	test("backward compat: controller without providers works", () => {
		@Route("/health")
		class HealthController extends Controller {
			@Get()
			check() {
				return { status: "ok" };
			}
		}

		const app = createApp({
			controllers: [HealthController],
			schema: typebox(),
		});

		expect(app.routes).toHaveProperty("/health");
	});

	test("injects providers into controller via createApp", async () => {
		@Injectable()
		class ItemService {
			items = ["a", "b"];
			getAll() {
				return this.items;
			}
		}

		@Route("/items")
		class ItemController extends Controller {
			@Inject(ItemService)
			svc!: ItemService;

			@Get()
			list() {
				return this.svc.getAll();
			}
		}

		const app = createApp({
			controllers: [ItemController],
			schema: typebox(),
			providers: [ItemService],
		});

		// Simulate calling the route handler
		const handler = (app.routes["/items"] as any).GET;
		const req = new Request("http://localhost/items", { method: "GET" });
		const res = await handler(req, {} as any);
		const body = await res.json();

		expect(body).toEqual(["a", "b"]);
	});

	test("injects providers into controller constructors via createApp", async () => {
		@Injectable()
		class ItemService {
			getAll() {
				return ["a", "b"];
			}
		}

		@Route("/items-ctor")
		class ItemController extends Controller {
			constructor(private readonly itemService: ItemService) {
				super();
			}

			@Get()
			list() {
				return this.itemService.getAll();
			}
		}

		const app = createApp({
			controllers: [ItemController],
			schema: typebox(),
			providers: [ItemService],
		});

		const handler = (app.routes["/items-ctor"] as any).GET;
		const req = new Request("http://localhost/items-ctor", { method: "GET" });
		const res = await handler(req, {} as any);

		expect(await res.json()).toEqual(["a", "b"]);
	});

	test("injects request-scoped providers into controller constructors per request", async () => {
		@Injectable({ scope: "request" })
		class RequestId {
			readonly id = crypto.randomUUID();
		}

		@Route("/req-id-ctor")
		class ReqIdController extends Controller {
			constructor(private readonly requestId: RequestId) {
				super();
			}

			@Get()
			handle() {
				return { id: this.requestId.id };
			}
		}

		const app = createApp({
			controllers: [ReqIdController],
			schema: typebox(),
			providers: [RequestId],
		});

		const handler = (app.routes["/req-id-ctor"] as any).GET;
		const makeReq = () => new Request("http://localhost/req-id-ctor", { method: "GET" });

		const res1 = await handler(makeReq(), {} as any);
		const res2 = await handler(makeReq(), {} as any);

		const body1 = await res1.json();
		const body2 = await res2.json();

		expect(body1.id).not.toBe(body2.id);
	});

	test("singleton provider shares state across requests", async () => {
		@Injectable()
		class HitCounter {
			count = 0;
			hit() {
				return ++this.count;
			}
		}

		@Route("/hits")
		class HitController extends Controller {
			@Inject(HitCounter)
			counter!: HitCounter;

			@Get()
			handle() {
				return { count: this.counter.hit() };
			}
		}

		const app = createApp({
			controllers: [HitController],
			schema: typebox(),
			providers: [HitCounter],
		});

		const handler = (app.routes["/hits"] as any).GET;
		const makeReq = () => new Request("http://localhost/hits", { method: "GET" });

		const res1 = await handler(makeReq(), {} as any);
		const res2 = await handler(makeReq(), {} as any);

		expect(await res1.json()).toEqual({ count: 1 });
		expect(await res2.json()).toEqual({ count: 2 });
	});

	test("request-scoped provider gets fresh instance per request", async () => {
		@Injectable({ scope: "request" })
		class RequestId {
			readonly id = crypto.randomUUID();
		}

		@Route("/req-id")
		class ReqIdController extends Controller {
			@Inject(RequestId)
			reqId!: RequestId;

			@Get()
			handle() {
				return { id: this.reqId.id };
			}
		}

		const app = createApp({
			controllers: [ReqIdController],
			schema: typebox(),
			providers: [RequestId],
		});

		const handler = (app.routes["/req-id"] as any).GET;
		const makeReq = () => new Request("http://localhost/req-id", { method: "GET" });

		const res1 = await handler(makeReq(), {} as any);
		const res2 = await handler(makeReq(), {} as any);

		const body1 = await res1.json();
		const body2 = await res2.json();

		expect(body1.id).not.toBe(body2.id);
	});

	test("useFactory with inject resolves dependencies", async () => {
		@Route("/db")
		class DbController extends Controller {
			@Inject("DB")
			db!: string;

			@Get()
			handle() {
				return { db: this.db };
			}
		}

		const app = createApp({
			controllers: [DbController],
			schema: typebox(),
			providers: [
				{ provide: "HOST", useValue: "localhost" },
				{
					provide: "DB",
					useFactory: (host: string) => `postgres://${host}/mydb`,
					inject: ["HOST"],
				},
			],
		});

		const handler = (app.routes["/db"] as any).GET;
		const req = new Request("http://localhost/db", { method: "GET" });
		const res = await handler(req, {} as any);

		expect(await res.json()).toEqual({ db: "postgres://localhost/mydb" });
	});
});
