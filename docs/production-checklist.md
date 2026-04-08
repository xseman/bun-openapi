# Production Checklist

[Docs Home](index.md) | [Previous: Examples Index](examples/index.md) | [Next: Publishing to Static Output](publishing-static.md)

Use this checklist before production deployment.

## API Contract

- Define @Returns for all public endpoints.
- Enable validateResponse when strict output contracts are required.
- Set operation metadata: @Summary, @Description, @OperationId.

## Validation and Errors

- Validate request inputs with schemas on params/query/headers/body.
- Use explicit errorFormatter response shape for clients.
- Keep exception messages safe for external exposure.

## Security

- Define OpenAPI securitySchemes.
- Apply @Security on protected controllers or methods.
- Map runtime securityGuards for each declared scheme.

## Observability

- Add request middleware for request IDs and user context.
- Use getCallerContext() in logger and metrics helpers.

## Documentation

- Enable swagger for environment where docs should be served.
- Write OpenAPI spec to disk through openapi.filePath for CI artifacts.
