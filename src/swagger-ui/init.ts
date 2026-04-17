import "swagger-ui-dist/swagger-ui.css";

import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle";

// Injected values via Bun.build -> define (src/router.ts)
declare const SPEC_URL: string;
declare const SWAGGER_CONFIG: Record<string, unknown>;

SwaggerUIBundle({
	...SWAGGER_CONFIG,
	url: SPEC_URL,
	dom_id: "#swagger-ui",
});
