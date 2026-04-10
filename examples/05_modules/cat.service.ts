import { Injectable } from "../../src/index.js";

export interface CatRecord {
	id: string;
	name: string;
	breed: string;
}

@Injectable()
export class CatService {
	#cats = new Map<string, CatRecord>();

	findAll(): CatRecord[] {
		return [...this.#cats.values()];
	}

	create(data: { name: string; breed: string; }): CatRecord {
		const cat: CatRecord = {
			id: crypto.randomUUID(),
			name: data.name,
			breed: data.breed,
		};
		this.#cats.set(cat.id, cat);
		return cat;
	}
}
