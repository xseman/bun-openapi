import { cacheAsync } from "decorator-toolkit/cache-async/legacy";

import { Injectable } from "../../src/index.js";

export interface UserRecord {
	id: string;
	name: string;
	email: string;
	createdAt: string;
}

const seedUsers: UserRecord[] = [
	{ id: "alice", name: "Alice Newton", email: "alice@example.com", createdAt: "2026-04-06T08:15:00.000Z" },
	{ id: "bruno", name: "Bruno Silva", email: "bruno@example.com", createdAt: "2026-04-06T08:45:00.000Z" },
];

@Injectable()
export class UserService {
	#users = new Map(seedUsers.map((u) => [u.id, u]));

	findAll(): UserRecord[] {
		return [...this.#users.values()];
	}

	@cacheAsync({ ttlMs: 5_000 })
	async findById(id: string): Promise<UserRecord | undefined> {
		return this.#users.get(id);
	}

	create(data: { name: string; email: string; }): UserRecord {
		const user: UserRecord = {
			id: crypto.randomUUID(),
			name: data.name,
			email: data.email,
			createdAt: new Date().toISOString(),
		};
		this.#users.set(user.id, user);
		return user;
	}
}
