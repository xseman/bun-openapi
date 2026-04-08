import {
	type CanActivate,
	CONTROLLER_GUARDS,
	getOrCreateMethod,
} from "../metadata.js";

export function UseGuards(...guards: Array<new(...args: any[]) => CanActivate>) {
	return function(target: any, propertyKeyOrDescriptor?: string | PropertyDescriptor): void {
		if (typeof propertyKeyOrDescriptor === "string") {
			const method = getOrCreateMethod(target, propertyKeyOrDescriptor);
			method.guards ??= [];
			method.guards.push(...guards);
			return;
		}

		const existing: Array<new(...args: any[]) => CanActivate> = Reflect.getOwnMetadata(CONTROLLER_GUARDS, target) ?? [];
		existing.push(...guards);
		Reflect.defineMetadata(CONTROLLER_GUARDS, existing, target);
	};
}
