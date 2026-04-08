import {
	describe,
	expect,
	test,
} from "bun:test";

import { Type } from "@sinclair/typebox";

import { typebox } from "./adapters/typebox.js";
import {
	Controller,
	createApp,
	Get,
	Inject,
	Injectable,
	Module,
	Route,
} from "./index.js";
import { resolveModules } from "./module.js";

// --- Test services ---

@Injectable()
class CatService {
	findAll() {
		return [{ name: "Tom" }];
	}
}

@Injectable()
class DogService {
	findAll() {
		return [{ name: "Rex" }];
	}
}

// --- Test controllers ---

@Route("/cats")
class CatController extends Controller {
	@Inject(CatService)
	catService!: CatService;

	@Get()
	list() {
		return this.catService.findAll();
	}
}

@Route("/dogs")
class DogController extends Controller {
	@Inject(DogService)
	dogService!: DogService;

	@Get()
	list() {
		return this.dogService.findAll();
	}
}

// --- Test modules ---

@Module({
	controllers: [CatController],
	providers: [CatService],
	exports: [CatService],
})
class CatModule {}

@Module({
	controllers: [DogController],
	providers: [DogService],
})
class DogModule {}

@Module({
	imports: [CatModule, DogModule],
})
class AppModule {}

// --- Tests ---

describe("resolveModules", () => {
	test("collects controllers from a single module", () => {
		const result = resolveModules([CatModule]);
		expect(result.controllers).toContain(CatController);
		expect(result.controllers).toHaveLength(1);
	});

	test("collects providers from a single module", () => {
		const result = resolveModules([CatModule]);
		expect(result.providers).toContain(CatService);
		expect(result.providers).toHaveLength(1);
	});

	test("collects from nested module imports", () => {
		const result = resolveModules([AppModule]);
		expect(result.controllers).toContain(CatController);
		expect(result.controllers).toContain(DogController);
		expect(result.controllers).toHaveLength(2);
	});

	test("merges providers from nested modules", () => {
		const result = resolveModules([AppModule]);
		expect(result.providers).toContain(CatService);
		expect(result.providers).toContain(DogService);
	});

	test("exported providers are available to importing module", () => {
		@Module({
			imports: [CatModule],
			controllers: [],
			providers: [],
		})
		class ConsumerModule {}

		const result = resolveModules([ConsumerModule]);
		// CatService is exported by CatModule, so it should be in providers
		expect(result.providers).toContain(CatService);
	});

	test("non-exported providers are still collected (registered internally)", () => {
		// DogService is NOT exported by DogModule
		const result = resolveModules([DogModule]);
		expect(result.providers).toContain(DogService);
	});

	test("throws for undecorated class", () => {
		class PlainClass {}
		expect(() => resolveModules([PlainClass])).toThrow("not decorated with @Module()");
	});

	test("does not duplicate when same module imported twice", () => {
		@Module({
			imports: [CatModule, CatModule],
		})
		class DuplicateModule {}

		const result = resolveModules([DuplicateModule]);
		expect(result.controllers).toHaveLength(1);
		expect(result.providers).toHaveLength(1);
	});

	test("throws when a module exports a provider it does not declare", () => {
		@Injectable()
		class BirdService {}

		@Module({
			providers: [],
			exports: [BirdService],
		})
		class InvalidExportsModule {}

		expect(() => resolveModules([InvalidExportsModule])).toThrow(
			'Module "InvalidExportsModule" cannot export provider token "BirdService" because it is not declared locally or re-exported from an imported module.',
		);
	});

	test("throws when a module re-exports a provider that is not available from imports", () => {
		@Injectable()
		class BirdService {}

		@Module({
			imports: [CatModule],
			exports: [BirdService],
		})
		class InvalidReExportModule {}

		expect(() => resolveModules([InvalidReExportModule])).toThrow(
			'Module "InvalidReExportModule" cannot export provider token "BirdService" because it is not declared locally or re-exported from an imported module.',
		);
	});

	test("allows re-exporting a provider from an imported module", () => {
		@Module({
			imports: [CatModule],
			exports: [CatService],
		})
		class ReExportModule {}

		const result = resolveModules([ReExportModule]);
		expect(result.providers).toContain(CatService);
	});

	test("throws for a direct circular module import", () => {
		class FeatureAModule {}
		class FeatureBModule {}

		Module({ imports: [FeatureBModule] })(FeatureAModule);
		Module({ imports: [FeatureAModule] })(FeatureBModule);

		expect(() => resolveModules([FeatureAModule])).toThrow(
			"Circular module import detected: FeatureAModule -> FeatureBModule -> FeatureAModule",
		);
	});

	test("throws for an indirect circular module import", () => {
		class FeatureAModule {}
		class FeatureBModule {}
		class FeatureCModule {}

		Module({ imports: [FeatureBModule] })(FeatureAModule);
		Module({ imports: [FeatureCModule] })(FeatureBModule);
		Module({ imports: [FeatureAModule] })(FeatureCModule);

		expect(() => resolveModules([FeatureAModule])).toThrow(
			"Circular module import detected: FeatureAModule -> FeatureBModule -> FeatureCModule -> FeatureAModule",
		);
	});
});

describe("@Module + createApp integration", () => {
	test("routes from module controllers are registered", () => {
		const { routes } = createApp({
			imports: [CatModule],
			schema: typebox(),
		});

		expect(routes["/cats"]).toBeDefined();
	});

	test("controllers from modules and direct config are merged", () => {
		@Route("/health")
		class HealthController extends Controller {
			@Get()
			check() {
				return { status: "ok" };
			}
		}

		const { routes } = createApp({
			controllers: [HealthController],
			imports: [CatModule],
			schema: typebox(),
		});

		expect(routes["/health"]).toBeDefined();
		expect(routes["/cats"]).toBeDefined();
	});

	test("module providers are injectable in module controllers", async () => {
		const { routes } = createApp({
			imports: [CatModule],
			schema: typebox(),
		});

		const handler = (routes["/cats"] as any).GET;
		const req = new Request("http://localhost/cats");
		const res = await handler(req, {});
		expect(res.status).toBe(200);

		const data = await res.json();
		expect(data).toEqual([{ name: "Tom" }]);
	});

	test("non-exported module providers stay injectable inside their own module", async () => {
		@Injectable()
		class SecretService {
			read() {
				return "secret";
			}
		}

		@Route("/internal-secret")
		class InternalSecretController extends Controller {
			@Inject(SecretService)
			secretService!: SecretService;

			@Get()
			read() {
				return { secret: this.secretService.read() };
			}
		}

		@Module({
			controllers: [InternalSecretController],
			providers: [SecretService],
		})
		class InternalSecretModule {}

		const { routes } = createApp({
			imports: [InternalSecretModule],
			schema: typebox(),
		});

		const res = await (routes["/internal-secret"] as any).GET(new Request("http://localhost/internal-secret"), {});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ secret: "secret" });
	});

	test("exported module providers are injectable in importing module controllers", async () => {
		@Injectable()
		class SharedService {
			value() {
				return "shared";
			}
		}

		@Module({ providers: [SharedService], exports: [SharedService] })
		class SharedModule {}

		@Route("/shared")
		class SharedConsumerController extends Controller {
			@Inject(SharedService)
			sharedService!: SharedService;

			@Get()
			read() {
				return { value: this.sharedService.value() };
			}
		}

		@Module({ imports: [SharedModule], controllers: [SharedConsumerController] })
		class SharedConsumerModule {}

		const { routes } = createApp({
			imports: [SharedConsumerModule],
			schema: typebox(),
		});

		const res = await (routes["/shared"] as any).GET(new Request("http://localhost/shared"), {});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ value: "shared" });
	});

	test("non-exported module providers are not injectable in importing module controllers", async () => {
		@Injectable()
		class PrivateService {
			read() {
				return "private";
			}
		}

		@Module({ providers: [PrivateService] })
		class PrivateModule {}

		@Route("/private-import")
		class PrivateImportController extends Controller {
			@Inject(PrivateService)
			privateService!: PrivateService;

			@Get()
			read() {
				return { value: this.privateService.read() };
			}
		}

		@Module({ imports: [PrivateModule], controllers: [PrivateImportController] })
		class PrivateImportConsumerModule {}

		const { routes } = createApp({
			imports: [PrivateImportConsumerModule],
			schema: typebox(),
			errorFormatter: (error, context) => ({
				status: context.status,
				body: {
					message: error instanceof Error ? error.message : "unknown",
				},
			}),
		});

		const res = await (routes["/private-import"] as any).GET(new Request("http://localhost/private-import"), {});
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({
			message: 'Provider token "PrivateService" is not visible in this module context.',
		});
	});

	test("non-exported module providers are not injectable in direct controllers", async () => {
		@Injectable()
		class PrivateService {
			read() {
				return "private";
			}
		}

		@Module({ providers: [PrivateService] })
		class PrivateModule {}

		@Route("/private-direct")
		class PrivateDirectController extends Controller {
			@Inject(PrivateService)
			privateService!: PrivateService;

			@Get()
			read() {
				return { value: this.privateService.read() };
			}
		}

		const { routes } = createApp({
			controllers: [PrivateDirectController],
			imports: [PrivateModule],
			schema: typebox(),
			errorFormatter: (error, context) => ({
				status: context.status,
				body: {
					message: error instanceof Error ? error.message : "unknown",
				},
			}),
		});

		const res = await (routes["/private-direct"] as any).GET(new Request("http://localhost/private-direct"), {});
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({
			message: 'Provider token "PrivateService" is not visible in this module context.',
		});
	});

	test("nested module app works end-to-end", async () => {
		const { routes } = createApp({
			imports: [AppModule],
			schema: typebox(),
		});

		expect(routes["/cats"]).toBeDefined();
		expect(routes["/dogs"]).toBeDefined();

		const catRes = await (routes["/cats"] as any).GET(new Request("http://localhost/cats"), {});
		expect(await catRes.json()).toEqual([{ name: "Tom" }]);

		const dogRes = await (routes["/dogs"] as any).GET(new Request("http://localhost/dogs"), {});
		expect(await dogRes.json()).toEqual([{ name: "Rex" }]);
	});

	test("spec includes paths from module controllers", () => {
		const { spec } = createApp({
			imports: [AppModule],
			schema: typebox(),
			openapi: {
				service: { name: "Test", version: "1.0.0" },
			},
		});

		expect(spec.paths["/cats"]).toBeDefined();
		expect(spec.paths["/dogs"]).toBeDefined();
	});
});
