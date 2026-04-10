import { AsyncLocalStorage } from "node:async_hooks";

import type { MiddlewareFunction } from "../../src/index.js";

export interface RequestContext {
	requestId: string;
	method: string;
	path: string;
	userId?: string;
	sessionId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
	return requestContextStorage.getStore();
}

export const requestContextMiddleware: MiddlewareFunction = (request, next) => {
	const url = new URL(request.url);

	return requestContextStorage.run(
		{
			requestId: crypto.randomUUID(),
			method: request.method,
			path: url.pathname,
			userId: request.headers.get("x-user-id") ?? undefined,
			sessionId: request.headers.get("x-session-id") ?? undefined,
		},
		next,
	);
};
