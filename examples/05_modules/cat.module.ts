import { Module } from "../../src/index.js";
import { CatController } from "./cat.controller.js";
import { CatService } from "./cat.service.js";

@Module({
	controllers: [CatController],
	providers: [CatService],
	exports: [CatService],
})
export class CatModule {}
