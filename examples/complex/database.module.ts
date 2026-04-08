import {
	Injectable,
	Module,
} from "../../src/index.js";

@Injectable()
export class DatabaseService {
	query(_sql: string) {
		return [];
	}
}

@Module({
	providers: [DatabaseService],
	exports: [DatabaseService],
})
export class DatabaseModule {}
