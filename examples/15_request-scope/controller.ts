import {
	IsString,
	MinLength,
} from "class-validator";

import {
	Body,
	Controller,
	Get,
	Post,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";
import { RequestContext } from "./request-context.js";
import { OrderService } from "./service.js";

class CreateOrderBody {
	@IsString()
	@MinLength(1)
	item!: string;
}

class OrderResponse {
	@IsString()
	orderId!: string;

	@IsString()
	requestId!: string;
}

class ContextResponse {
	@IsString()
	requestId!: string;
}

@Route("/orders")
@Tags("Orders")
export class OrderController extends Controller {
	constructor(
		private readonly orderService: OrderService,
		private readonly ctx: RequestContext,
	) {
		super();
	}

	@Get()
	@Summary("List orders (shows request-scoped context)")
	@Returns(200, ContextResponse, "Request context info")
	list() {
		// Both the controller and the service share the SAME RequestContext
		// instance within this request — but a different request gets its own.
		this.ctx.addTag("controller:list");
		return this.orderService.listOrders();
	}

	@Post()
	@Summary("Create an order (shows request-scoped context)")
	@Returns(201, OrderResponse, "Created order with request ID")
	create(@Body(CreateOrderBody) body: CreateOrderBody) {
		this.ctx.addTag("controller:create");
		const result = this.orderService.createOrder(body.item);
		this.setStatus(201);
		return result;
	}
}
