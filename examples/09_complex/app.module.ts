import { Module } from "../../src/index.js";
import { AuthModule } from "./auth.module.js";
import { PostsModule } from "./posts.module.js";
import { UsersModule } from "./users.module.js";

@Module({
	imports: [AuthModule, UsersModule, PostsModule],
})
export class AppModule {}
