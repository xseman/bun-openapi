import { Injectable } from "../../src/index.js";
import { RequestContext } from "./request-context.js";

/**
 * A singleton service that receives the request-scoped RequestContext.
 * Even though OrderService itself is a singleton, when it resolves
 * RequestContext during a request, it gets the instance for THAT request.
 */
@Injectable()
export class OrderService {
	constructor(private readonly ctx: RequestContext) {}

	createOrder(item: string): { orderId: string; requestId: string; tags: string[]; } {
		this.ctx.addTag("order:created");
		return {
			orderId: crypto.randomUUID(),
			requestId: this.ctx.requestId,
			tags: this.ctx.getTags(),
		};
	}

	listOrders(): { requestId: string; elapsedMs: number; } {
		this.ctx.addTag("order:listed");
		return {
			requestId: this.ctx.requestId,
			elapsedMs: this.ctx.getElapsedMs(),
		};
	}
}
