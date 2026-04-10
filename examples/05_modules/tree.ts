import { buildModuleTree } from "../../src/index.js";
import { AppModule } from "./app.module.js";

const tree = buildModuleTree(AppModule);
console.log(JSON.stringify(tree, null, 2));
