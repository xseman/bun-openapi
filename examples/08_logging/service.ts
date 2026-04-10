import { sleep } from "bun";
import { execTime } from "decorator-toolkit/exec-time/legacy";

import { Injectable } from "../../src/index.js";
import { Logger } from "./logger.js";

export interface ItemRecord {
	id: string;
	name: string;
	createdAt: string;
}

@Injectable()
export class ItemService {
	#items = new Map<string, ItemRecord>();

	constructor(
		private readonly logger: Logger,
	) {}

	@execTime
	async findAll(): Promise<ItemRecord[]> {
		this.logger.log("Loading items from the in-memory store");
		await sleep(Math.random() * 1_000);

		this.logger.log("Loaded items after an async boundary");
		return [...this.#items.values()];
	}

	@execTime
	async create(data: { name: string; }): Promise<ItemRecord> {
		await sleep(Math.random() * 1_000);
		this.logger.log(`Persisting item "${data.name}"`);

		const item: ItemRecord = {
			id: crypto.randomUUID(),
			name: data.name,
			createdAt: new Date().toISOString(),
		};

		this.#items.set(item.id, item);
		await sleep(Math.random() * 1_000);
		this.logger.log(`Stored item "${item.id}" after an async boundary`);

		return item;
	}
}
