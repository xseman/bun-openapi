import { Module } from "../../src/index.js";
import { CatModule } from "./cat.module.js";

@Module({
	imports: [CatModule],
})
export class AppModule {}
