import "reflect-metadata";

import initSqlJs from "sql.js";
import { DataSource } from "typeorm";
import { User } from "./entities/user.entity.js";

const SQL = await initSqlJs();

export const AppDataSource = new DataSource({
	type: "sqljs",
	driver: SQL,
	synchronize: true,
	entities: [User],
});
