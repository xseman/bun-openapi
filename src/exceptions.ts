function defaultMessageForStatus(status: number): string {
	switch (status) {
		case 400:
			return "Bad Request";
		case 401:
			return "Unauthorized";
		case 403:
			return "Forbidden";
		case 404:
			return "Not Found";
		case 405:
			return "Method Not Allowed";
		case 406:
			return "Not Acceptable";
		case 408:
			return "Request Timeout";
		case 409:
			return "Conflict";
		case 410:
			return "Gone";
		case 412:
			return "Precondition Failed";
		case 413:
			return "Payload Too Large";
		case 415:
			return "Unsupported Media Type";
		case 422:
			return "Unprocessable Entity";
		case 500:
			return "Internal Server Error";
		case 501:
			return "Not Implemented";
		case 502:
			return "Bad Gateway";
		case 503:
			return "Service Unavailable";
		case 504:
			return "Gateway Timeout";
		default:
			return `HTTP ${status}`;
	}
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
	if (!headers) {
		return {};
	}

	if (headers instanceof Headers) {
		return Object.fromEntries(headers.entries());
	}

	if (Array.isArray(headers)) {
		return Object.fromEntries(headers);
	}

	return { ...headers };
}

function normalizeBody(body: unknown, fallbackMessage: string): unknown {
	if (body === undefined) {
		return { message: fallbackMessage };
	}

	if (typeof body === "string") {
		return { message: body };
	}

	return body;
}

function resolveMessage(body: unknown, fallbackMessage: string): string {
	if (typeof body === "string") {
		return body;
	}

	if (body && typeof body === "object" && "message" in body && typeof (body as { message?: unknown; }).message === "string") {
		return (body as { message: string; }).message;
	}

	return fallbackMessage;
}

export interface HttpExceptionOptions {
	headers?: HeadersInit;
	cause?: unknown;
}

export class HttpException extends Error {
	#status: number;
	#body: unknown;
	#headers: Record<string, string>;

	constructor(status: number, body?: unknown, options?: HttpExceptionOptions) {
		const fallbackMessage = defaultMessageForStatus(status);
		const normalizedBody = normalizeBody(body, fallbackMessage);
		super(resolveMessage(normalizedBody, fallbackMessage), options?.cause ? { cause: options.cause } : undefined);
		this.name = new.target.name;
		this.#status = status;
		this.#body = normalizedBody;
		this.#headers = normalizeHeaders(options?.headers);
	}

	getStatus(): number {
		return this.#status;
	}

	getBody(): unknown {
		return this.#body;
	}

	getHeaders(): Record<string, string> {
		return { ...this.#headers };
	}
}

export class BadRequestException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(400, body, options);
	}
}

export class UnauthorizedException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(401, body, options);
	}
}

export class ForbiddenException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(403, body, options);
	}
}

export class NotFoundException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(404, body, options);
	}
}

export class MethodNotAllowedException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(405, body, options);
	}
}

export class NotAcceptableException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(406, body, options);
	}
}

export class RequestTimeoutException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(408, body, options);
	}
}

export class ConflictException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(409, body, options);
	}
}

export class GoneException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(410, body, options);
	}
}

export class PreconditionFailedException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(412, body, options);
	}
}

export class PayloadTooLargeException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(413, body, options);
	}
}

export class UnsupportedMediaTypeException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(415, body, options);
	}
}

export class UnprocessableEntityException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(422, body, options);
	}
}

export class InternalServerErrorException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(500, body, options);
	}
}

export class NotImplementedException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(501, body, options);
	}
}

export class BadGatewayException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(502, body, options);
	}
}

export class ServiceUnavailableException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(503, body, options);
	}
}

export class GatewayTimeoutException extends HttpException {
	constructor(body?: unknown, options?: HttpExceptionOptions) {
		super(504, body, options);
	}
}
