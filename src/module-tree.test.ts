import {
	describe,
	expect,
	test,
} from "bun:test";

import {
	Controller,
	Get,
	Inject,
	Injectable,
	Middleware,
	Module,
	Post,
	Route,
} from "./index.js";
import type { MiddlewareFunction } from "./index.js";
import {
	buildAppTree,
	buildModuleTree,
} from "./module-tree.js";
import type { ModuleTreeNode } from "./module-tree.js";

// --- Test services ---

@Injectable()
class CatService {
	findAll() {
		return [];
	}
}

@Injectable({ scope: "request" })
class RequestLogger {
	log() {}
}

// --- Test controllers ---

@Route("/cats")
class CatController extends Controller {
	@Inject(CatService)
	catService!: CatService;

	@Get()
	list() {
		return [];
	}

	@Post()
	create() {
		return {};
	}
}

@Route("/dogs")
class DogController extends Controller {
	@Get()
	list() {
		return [];
	}
}

// --- Test modules ---

@Module({
	controllers: [CatController],
	providers: [CatService, RequestLogger],
	exports: [CatService],
})
class CatModule {}

@Module({
	controllers: [DogController],
	providers: [{ provide: "API_KEY", useValue: "secret" }],
})
class DogModule {}

@Module({
	imports: [CatModule, DogModule],
})
class AppModule {}

// --- Tests ---

describe("buildModuleTree", () => {
	test("single module with controllers and providers", () => {
		const tree = buildModuleTree(CatModule);

		expect(tree.name).toBe("CatModule");
		expect(tree.type).toBe("module");
		expect(tree.exports).toEqual(["CatService"]);
		expect(tree.children).toHaveLength(3); // 1 controller + 2 providers
	});

	test("controller node has prefix and method children", () => {
		const tree = buildModuleTree(CatModule);
		const ctrl = tree.children!.find((c) => c.type === "controller")!;

		expect(ctrl.name).toBe("CatController");
		expect(ctrl.prefix).toBe("/cats");
		expect(ctrl.children).toHaveLength(2);

		const get = ctrl.children!.find((m) => m.verb === "GET")!;
		expect(get.name).toBe("GET /cats");
		expect(get.type).toBe("method");
		expect(get.path).toBe("/cats");

		const post = ctrl.children!.find((m) => m.verb === "POST")!;
		expect(post.name).toBe("POST /cats");
		expect(post.path).toBe("/cats");
	});

	test("provider nodes include scope and providerType", () => {
		const tree = buildModuleTree(CatModule);
		const providers = tree.children!.filter((c) => c.type === "provider");

		const catSvc = providers.find((p) => p.name === "CatService")!;
		expect(catSvc.providerType).toBe("class");
		expect(catSvc.scope).toBe("singleton");

		const logger = providers.find((p) => p.name === "RequestLogger")!;
		expect(logger.providerType).toBe("class");
		expect(logger.scope).toBe("request");
	});

	test("value provider node", () => {
		const tree = buildModuleTree(DogModule);
		const apiKey = tree.children!.find((p) => p.name === "API_KEY")!;

		expect(apiKey.type).toBe("provider");
		expect(apiKey.providerType).toBe("value");
		expect(apiKey.scope).toBe("singleton");
	});

	test("nested modules produce hierarchy", () => {
		const tree = buildModuleTree(AppModule);

		expect(tree.name).toBe("AppModule");
		expect(tree.children).toHaveLength(2); // CatModule + DogModule

		const catMod = tree.children!.find((c) => c.name === "CatModule")!;
		expect(catMod.type).toBe("module");
		expect(catMod.children!.length).toBeGreaterThan(0);

		const dogMod = tree.children!.find((c) => c.name === "DogModule")!;
		expect(dogMod.type).toBe("module");
	});

	test("diamond import produces ref node", () => {
		@Module({ imports: [CatModule] })
		class FeatureA {}

		@Module({ imports: [CatModule] })
		class FeatureB {}

		@Module({ imports: [FeatureA, FeatureB] })
		class RootModule {}

		const tree = buildModuleTree(RootModule);
		const featureA = tree.children!.find((c) => c.name === "FeatureA")!;
		const featureB = tree.children!.find((c) => c.name === "FeatureB")!;

		// CatModule appears fully under FeatureA
		const catInA = featureA.children!.find((c) => c.name === "CatModule")!;
		expect(catInA.ref).toBeUndefined();
		expect(catInA.children).toBeDefined();

		// CatModule is a ref stub under FeatureB
		const catInB = featureB.children!.find((c) => c.name === "CatModule")!;
		expect(catInB.ref).toBe(true);
		expect(catInB.children).toBeUndefined();
	});

	test("module without exports has no exports field", () => {
		const tree = buildModuleTree(DogModule);
		expect(tree.exports).toBeUndefined();
	});

	test("empty module produces no children", () => {
		@Module({})
		class EmptyModule {}

		const tree = buildModuleTree(EmptyModule);
		expect(tree.children).toBeUndefined();
	});

	test("throws for undecorated class", () => {
		class Plain {}
		expect(() => buildModuleTree(Plain)).toThrow("not decorated with @Module()");
	});

	test("output is JSON-serializable", () => {
		const tree = buildModuleTree(AppModule);
		const json = JSON.stringify(tree);
		const parsed = JSON.parse(json) as ModuleTreeNode;

		expect(parsed.name).toBe("AppModule");
		expect(parsed.type).toBe("module");
		expect(parsed.children).toHaveLength(2);
	});

	test("controller-level middleware appears as children", () => {
		function authGuard(_req: Request, next: () => Promise<Response>) {
			return next();
		}
		function logging(_req: Request, next: () => Promise<Response>) {
			return next();
		}

		@Route("/mw")
		@Middleware(authGuard, logging)
		class MwController extends Controller {
			@Get()
			index() {
				return {};
			}
		}

		@Module({ controllers: [MwController] })
		class MwModule {}

		const tree = buildModuleTree(MwModule);
		const ctrl = tree.children!.find((c) => c.name === "MwController")!;

		// 2 middleware + 1 method
		expect(ctrl.children).toHaveLength(3);

		const mws = ctrl.children!.filter((c) => c.type === "middleware");
		expect(mws).toHaveLength(2);
		expect(mws[0].name).toBe("authGuard");
		expect(mws[1].name).toBe("logging");
	});

	test("method-level middleware appears as children of method node", () => {
		function adminOnly(_req: Request, next: () => Promise<Response>) {
			return next();
		}

		@Route("/m2")
		class M2Controller extends Controller {
			@Get()
			@Middleware(adminOnly)
			secret() {
				return {};
			}

			@Post()
			open() {
				return {};
			}
		}

		@Module({ controllers: [M2Controller] })
		class M2Module {}

		const tree = buildModuleTree(M2Module);
		const ctrl = tree.children!.find((c) => c.name === "M2Controller")!;
		const getMethod = ctrl.children!.find((c) => c.verb === "GET")!;

		expect(getMethod.children).toHaveLength(1);
		expect(getMethod.children![0].type).toBe("middleware");
		expect(getMethod.children![0].name).toBe("adminOnly");

		// POST method has no middleware children
		const postMethod = ctrl.children!.find((c) => c.verb === "POST")!;
		expect(postMethod.children).toBeUndefined();
	});

	test("anonymous middleware gets fallback name", () => {
		@Route("/anon")
		@Middleware((_req, next) => next())
		class AnonController extends Controller {
			@Get()
			index() {
				return {};
			}
		}

		@Module({ controllers: [AnonController] })
		class AnonModule {}

		const tree = buildModuleTree(AnonModule);
		const ctrl = tree.children!.find((c) => c.name === "AnonController")!;
		const mw = ctrl.children!.find((c) => c.type === "middleware")!;
		expect(mw.name).toBe("(anonymous)");
	});
});

describe("buildAppTree", () => {
	test("renders direct controllers and providers under an app root", () => {
		const tree = buildAppTree({
			controllers: [CatController],
			providers: [CatService, { provide: "API_KEY", useValue: "secret" }],
		});

		expect(tree.name).toBe("App");
		expect(tree.type).toBe("module");
		expect(tree.children).toHaveLength(3);
		expect(tree.children!.find((c) => c.name === "CatController" && c.type === "controller")).toBeDefined();
		expect(tree.children!.find((c) => c.name === "CatService" && c.type === "provider")).toBeDefined();
		expect(tree.children!.find((c) => c.name === "API_KEY")?.providerType).toBe("value");
	});

	test("preserves a single imported module as the viewer root", () => {
		const tree = buildAppTree({ imports: [CatModule] });

		expect(tree.name).toBe("CatModule");
		expect(tree.type).toBe("module");
		expect(tree.children).toHaveLength(3);
	});
});
