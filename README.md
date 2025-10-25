# Deserve [![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE) [![Deno](https://img.shields.io/badge/Deno-2.5.4-blue)](https://deno.land) [![JSR](https://jsr.io/badges/@neabyte/deserve)](https://jsr.io/@neabyte/deserve)

HTTP server with file-based routing for Deno that supports middleware and dynamic routing.

## Installation

Install [Deno](https://github.com/denoland/deno_install) 2.5.4+ and run `deno init` for new projects.

Add Deserve using the `deno add` command:

```bash
deno add jsr:@neabyte/deserve
```

Follow our [installing guide](https://docs-deserve.neabyte.com/getting-started/installation) for more information.

## Table of Contents

- **Getting Started**
  - [Installation](https://docs-deserve.neabyte.com/getting-started/installation) - Set up Deserve in your project
  - [Quick Start](https://docs-deserve.neabyte.com/getting-started/quick-start) - Create your first API in minutes
  - [Server Configuration](https://docs-deserve.neabyte.com/getting-started/server-configuration) - Server setup and shutdown
  - [Custom Configuration](https://docs-deserve.neabyte.com/getting-started/custom-configuration) - Configure router options

- **Core Concepts**
  - [File-based Routing](https://docs-deserve.neabyte.com/core-concepts/file-based-routing) - How file structure becomes API endpoints
  - [Route Patterns](https://docs-deserve.neabyte.com/core-concepts/route-patterns) - Dynamic routes and parameter matching
  - [HTTP Methods](https://docs-deserve.neabyte.com/core-concepts/http-methods) - All supported HTTP methods
  - [Request Handling](https://docs-deserve.neabyte.com/core-concepts/request-handling) - Enhanced request object with automatic parsing

- **Middleware**
  - [Global Middleware](https://docs-deserve.neabyte.com/middleware/global) - Cross-cutting functionality
  - [Route-Specific Middleware](https://docs-deserve.neabyte.com/middleware/route-specific) - Targeted middleware for specific routes
  - [CORS Middleware](https://docs-deserve.neabyte.com/middleware/cors) - Cross-origin request handling
  - [WebSocket Middleware](https://docs-deserve.neabyte.com/middleware/websocket) - Real-time WebSocket communication

- **Response Utilities**
  - [Data Downloads](https://docs-deserve.neabyte.com/response/data) - Download in-memory content
  - [File Downloads](https://docs-deserve.neabyte.com/response/file) - Download files from filesystem
  - [JSON Format](https://docs-deserve.neabyte.com/response/json) - Create JSON responses easily
  - [Text Format](https://docs-deserve.neabyte.com/response/text) - Plain text responses
  - [HTML Format](https://docs-deserve.neabyte.com/response/html) - HTML content responses
  - [Redirect](https://docs-deserve.neabyte.com/response/redirect) - Redirect responses

- **Static Files**
  - [Basic Static Serving](https://docs-deserve.neabyte.com/static-file/basic) - Serve static files from directories
  - [Multiple Directories](https://docs-deserve.neabyte.com/static-file/multiple) - Serve from multiple locations

- **Error Handling**
  - [Object Details](https://docs-deserve.neabyte.com/error-handling/object-details) - Detailed error information

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/NeaByteLab/Deserve/pulls).

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
