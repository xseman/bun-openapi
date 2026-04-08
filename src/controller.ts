/**
 * Base class for API controllers.
 * Provides status code and header management for responses.
 */
export class Controller {
	#status?: number;
	#headers: Record<string, string> = {};

	setStatus(code: number): void {
		this.#status = code;
	}

	getStatus(): number | undefined {
		return this.#status;
	}

	setHeader(name: string, value: string): void {
		this.#headers[name] = value;
	}

	getHeaders(): Record<string, string> {
		return { ...this.#headers };
	}
}
