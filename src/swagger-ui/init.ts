import "swagger-ui-dist/swagger-ui.css";
import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle";

declare const SPEC_URL: string;

SwaggerUIBundle({
	url: SPEC_URL,
	dom_id: "#swagger-ui",
});
