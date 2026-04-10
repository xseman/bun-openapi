import {
	IsDateString,
	IsIn,
	IsNumber,
	IsOptional,
	IsString,
	Min,
	MinLength,
} from "class-validator";
import {
	Body,
	Controller,
	Deprecated,
	Description,
	Get,
	Hidden,
	OperationId,
	Param,
	Post,
	Produces,
	Query,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";

class Product {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsNumber()
	@Min(0)
	price!: number;

	@IsString()
	category!: string;
}

class CreateProduct {
	@IsString()
	@MinLength(1)
	name!: string;

	@IsNumber()
	@Min(0)
	price!: number;

	@IsString()
	category!: string;
}

class ProductParams {
	@IsString()
	id!: string;
}

class ProductQuery {
	@IsOptional()
	@IsString()
	category?: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	minPrice?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	maxPrice?: number;
}

class Order {
	@IsString()
	id!: string;

	@IsString()
	productId!: string;

	@IsNumber()
	@Min(1)
	quantity!: number;

	@IsNumber()
	total!: number;

	@IsIn(["pending", "shipped", "delivered"])
	status!: "pending" | "shipped" | "delivered";
}

class CreateOrder {
	@IsString()
	productId!: string;

	@IsNumber()
	@Min(1)
	quantity!: number;
}

class ErrorResponse {
	@IsString()
	message!: string;
}

class HealthStatus {
	@IsString()
	status!: string;
}

class VersionResponse {
	@IsString()
	version!: string;
}

// --- Controllers ---

@Route("/products")
@Tags("Products")
class ProductController extends Controller {
	@Get()
	@OperationId("listProducts")
	@Summary("List products")
	@Description("Returns products filtered by category and price range")
	@Returns(200, [Product], "List of products")
	list(@Query(ProductQuery) query: ProductQuery) {
		const products = [
			{ id: "1", name: "Widget", price: 9.99, category: "gadgets" },
			{ id: "2", name: "Cable", price: 4.99, category: "accessories" },
		];

		return products.filter((product) => {
			if (query.category && product.category !== query.category) return false;
			if (query.minPrice !== undefined && product.price < query.minPrice) return false;
			if (query.maxPrice !== undefined && product.price > query.maxPrice) return false;
			return true;
		});
	}

	@Get("/:id")
	@OperationId("getProduct")
	@Summary("Get product by ID")
	@Returns(200, Product, "The product")
	@Returns(404, ErrorResponse, "Product not found")
	getById(@Param(ProductParams) params: ProductParams) {
		return { id: params.id, name: "Widget", price: 9.99, category: "gadgets" };
	}

	@Post()
	@OperationId("createProduct")
	@Summary("Create a product")
	@Returns(201, Product, "Created product")
	create(@Body(CreateProduct) body: CreateProduct) {
		this.setStatus(201);
		return { id: crypto.randomUUID(), ...body };
	}

	@Get("/:id/export")
	@Produces("text/csv")
	@Summary("Export product as CSV")
	@Returns(200, { type: "string" }, "CSV data")
	exportCsv(@Param(ProductParams) params: ProductParams) {
		return `id,name,price,category\n${params.id},Widget,9.99,gadgets`;
	}

	@Deprecated()
	@Get("/legacy")
	@Summary("Legacy product list")
	@Returns(200, [Product], "Deprecated product list")
	legacy() {
		return [];
	}
}

@Route("/orders")
@Tags("Orders")
class OrderController extends Controller {
	@Get()
	@OperationId("listOrders")
	@Summary("List orders")
	@Returns(200, [Order], "List of orders")
	list() {
		return [];
	}

	@Post()
	@OperationId("createOrder")
	@Summary("Place an order")
	@Returns(201, Order, "Created order")
	@Returns(400, ErrorResponse, "Invalid order")
	create(@Body(CreateOrder) body: CreateOrder) {
		this.setStatus(201);
		return {
			id: crypto.randomUUID(),
			productId: body.productId,
			quantity: body.quantity,
			total: body.quantity * 9.99,
			status: "pending" as const,
		};
	}
}

@Route("/internal")
@Tags("Internal")
class HealthController extends Controller {
	@Get("/health")
	@Hidden()
	@Returns(200, HealthStatus)
	health() {
		return { status: "ok" };
	}

	@Get("/version")
	@Summary("Get API version")
	@Returns(200, VersionResponse, "API version")
	version() {
		return { version: "1.0.0" };
	}
}

export { HealthController, OrderController, ProductController };
