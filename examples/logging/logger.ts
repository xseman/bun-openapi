import {
	getCallerContext,
	Injectable,
} from "../../src/index.js";
import { getRequestContext } from "./request-context.js";

type LogLevel = "LOG" | "WARN" | "ERROR";

@Injectable()
export class Logger {
	log(message: string): void {
		this.write("LOG", message);
	}

	warn(message: string): void {
		this.write("WARN", message);
	}

	error(message: string): void {
		this.write("ERROR", message);
	}

	private write(level: LogLevel, message: string): void {
		const context = getRequestContext();
		const caller = getCallerContext();

		const requestPrefix = context
			? [
				`[${context.requestId}]`,
				`${context.method} ${context.path}`,
				context.userId ? `user=${context.userId}` : undefined,
				context.sessionId ? `session=${context.sessionId}` : undefined,
			].filter(Boolean).join(" ")
			: "[no-request-context]";

		const callerPrefix = caller ? ` [${caller.className}.${caller.methodName}]` : "";
		const line = `${requestPrefix}${callerPrefix} ${message}`;

		switch (level) {
			case "WARN":
				console.warn(line);
				break;
			case "ERROR":
				console.error(line);
				break;
			default:
				console.log(line);
		}
	}
}
