import {
	IsDateString,
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

import { Logger } from "./logger.js";
import { ItemService } from "./service.js";

class CreateItemBody {
	@IsString()
	@MinLength(1)
	name!: string;
}

class Item {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsDateString()
	createdAt!: string;
}

@Route("/items")
@Tags("Items")
export class ItemController extends Controller {
	constructor(
		private readonly items: ItemService,
		private readonly logger: Logger,
	) {
		super();
	}

	@Get()
	@Summary("List items")
	@Returns(200, [Item], "List of items")
	async list() {
		this.logger.log("Handling list request");
		return await this.items.findAll();
	}

	@Post()
	@Summary("Create item")
	@Returns(201, Item, "Created item")
	async create(@Body(CreateItemBody) body: CreateItemBody) {
		this.logger.log("Handling create request");
		const item = await this.items.create(body);

		this.setStatus(201);
		return item;
	}
}
