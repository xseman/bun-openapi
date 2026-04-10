import { Injectable } from "../../src/index.js";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface SessionEntry {
	userId: string;
	createdAt: number;
}

@Injectable()
export class SessionStore {
	#store = new Map<string, SessionEntry>();

	/**
	 * Create a new session for a user and return the session ID.
	 */
	create(userId: string): string {
		const id = crypto.randomUUID();
		this.#store.set(id, { userId: userId, createdAt: Date.now() });
		return id;
	}

	/**
	 * Look up a session by ID. Returns the userId if the session exists and
	 * has not expired, or null otherwise.
	 */
	get(id: string): string | null {
		const entry = this.#store.get(id);
		if (!entry) return null;

		if (Date.now() - entry.createdAt > SESSION_TTL_MS) {
			this.#store.delete(id);
			return null;
		}

		return entry.userId;
	}

	/**
	 * Destroy a session (logout).
	 */
	destroy(id: string): void {
		this.#store.delete(id);
	}
}
