# Examples Index

[Docs Home](../index.md) | [Previous: createApp Config Reference](../reference/create-app-config.md) | [Next: Production Checklist](../production-checklist.md)

Runnable examples are under the repository `examples/` directory. They are numbered in order of increasing complexity.

| Example                                                                                                        | Focus                                                                             |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [01_hello-world](https://github.com/xseman/bun-openapi/tree/master/examples/01_hello-world/)                   | Minimal single-route server                                                       |
| [02_crud](https://github.com/xseman/bun-openapi/tree/master/examples/02_crud/)                                 | CRUD endpoints, DTOs, exceptions, Swagger UI, error formatter                     |
| [03_multi-controller](https://github.com/xseman/bun-openapi/tree/master/examples/03_multi-controller/)         | Multiple controllers and metadata decorators                                      |
| [04_dependency-injection](https://github.com/xseman/bun-openapi/tree/master/examples/04_dependency-injection/) | Providers, token injection, and service decorators                                |
| [05_modules](https://github.com/xseman/bun-openapi/tree/master/examples/05_modules/)                           | Module imports/exports and visibility                                             |
| [06_guards](https://github.com/xseman/bun-openapi/tree/master/examples/06_guards/)                             | Guards, security guard mapping, role checks, @Security decorator                  |
| [07_interceptors](https://github.com/xseman/bun-openapi/tree/master/examples/07_interceptors/)                 | Response transformation and short-circuiting                                      |
| [08_logging](https://github.com/xseman/bun-openapi/tree/master/examples/08_logging/)                           | AsyncLocalStorage request context and caller tags                                 |
| [09_complex](https://github.com/xseman/bun-openapi/tree/master/examples/09_complex/)                           | Multi-module composition                                                          |
| [10_mvc](https://github.com/xseman/bun-openapi/tree/master/examples/10_mvc/)                                   | Server-side rendering with @Render and Handlebars                                 |
| [11_jwt-auth](https://github.com/xseman/bun-openapi/tree/master/examples/11_jwt-auth/)                         | JWT Bearer API auth with TypeORM, DataSource DI, Bun.password, and jose           |
| [12_form-auth](https://github.com/xseman/bun-openapi/tree/master/examples/12_form-auth/)                       | Form-based web auth with JWT-in-cookie, DataSource DI, and Handlebars views       |
| [13_typeorm-relations](https://github.com/xseman/bun-openapi/tree/master/examples/13_typeorm-relations/)       | TypeORM one-to-many / many-to-one relations with DataSource DI                    |
| [14_session-auth](https://github.com/xseman/bun-openapi/tree/master/examples/14_session-auth/)                 | Stateful server-side sessions with HttpOnly cookie, DataSource DI, and Handlebars |
| [15_request-scope](https://github.com/xseman/bun-openapi/tree/master/examples/15_request-scope/)               | Request-scoped DI with `@Injectable({ scope: "request" })` for per-request state  |

## How To Run An Example

```sh
cd examples/01_hello-world
bun server.ts
```
