import { Injectable } from "../../src/index.js";

/**
 * A request-scoped service that holds per-request state.
 * Each HTTP request gets its own fresh instance, so state
 * is isolated between concurrent requests.
 */
@Injectable({ scope: "request" })
export class RequestContext {
	requestId = crypto.randomUUID();
	startedAt = Date.now();
	#tags: string[] = [];

	addTag(tag: string) {
		this.#tags.push(tag);
	}

	getTags(): string[] {
		return [...this.#tags];
	}

	getElapsedMs(): number {
		return Date.now() - this.startedAt;
	}
}
