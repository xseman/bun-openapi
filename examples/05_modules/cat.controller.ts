import {
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
import { CatService } from "./cat.service.js";

class CreateCat {
	@IsString()
	@MinLength(1)
	name!: string;

	@IsString()
	@MinLength(1)
	breed!: string;
}

class Cat {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsString()
	breed!: string;
}

@Route("/cats")
@Tags("Cats")
export class CatController extends Controller {
	constructor(private readonly catService: CatService) {
		super();
	}

	@Get()
	@Summary("List all cats")
	@Returns(200, [Cat], "List of cats")
	list() {
		return this.catService.findAll();
	}

	@Post()
	@Summary("Create a cat")
	@Returns(201, Cat, "Created cat")
	create(@Body(CreateCat) body: CreateCat) {
		this.setStatus(201);
		return this.catService.create(body);
	}
}
