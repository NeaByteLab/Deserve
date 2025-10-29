# Deserve [![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE) [![Deno](https://img.shields.io/badge/Deno-2.5.4-blue)](https://deno.land) [![JSR](https://jsr.io/badges/@neabyte/deserve)](https://jsr.io/@neabyte/deserve)

Build HTTP server effortlessly with zero configuration for productivity.

## Installation

Install [Deno](https://github.com/denoland/deno_install) 2.5.4+ and run `deno init` for new projects.

Add Deserve using the `deno add` command:

```bash
deno add jsr:@neabyte/deserve
```

Follow our [installing guide](https://docs-deserve.neabyte.com/en/getting-started/installation) for more information.

## Table of Contents

- **Getting Started**
  - [Installation](https://docs-deserve.neabyte.com/en/getting-started/installation) - Set up Deserve in your project
  - [Quick Start](https://docs-deserve.neabyte.com/en/getting-started/quick-start) - Create your first API in minutes
  - [Server Configuration](https://docs-deserve.neabyte.com/en/getting-started/server-configuration) - Server setup and shutdown
  - [Routes Configuration](https://docs-deserve.neabyte.com/en/getting-started/routes-configuration) - Configure router options

- **Core Concepts**
  - [Philosophy](https://docs-deserve.neabyte.com/en/core-concepts/philosophy) - Framework design principles
  - [File-based Routing](https://docs-deserve.neabyte.com/en/core-concepts/file-based-routing) - How file structure becomes API endpoints
  - [Route Patterns](https://docs-deserve.neabyte.com/en/core-concepts/route-patterns) - Dynamic routes and parameter matching
  - [Context Object](https://docs-deserve.neabyte.com/en/core-concepts/context-object) - Request context wrapper with convenient methods
  - [Request Handling](https://docs-deserve.neabyte.com/en/core-concepts/request-handling) - Enhanced request object with automatic parsing

- **Middleware**
  - [Use Global](https://docs-deserve.neabyte.com/en/middleware/global) - Cross-cutting functionality
  - [Use Route-Specific](https://docs-deserve.neabyte.com/en/middleware/route-specific) - Targeted middleware for specific routes
  - [Basic Auth](https://docs-deserve.neabyte.com/en/middleware/basic-auth) - HTTP Basic Authentication
  - [CORS](https://docs-deserve.neabyte.com/en/middleware/cors) - Cross-origin request handling
  - [WebSocket](https://docs-deserve.neabyte.com/en/middleware/websocket) - Real-time bidirectional communication

- **Response Utilities**
  - [JSON Format](https://docs-deserve.neabyte.com/en/response/json) - Create JSON responses easily
  - [Text Format](https://docs-deserve.neabyte.com/en/response/text) - Plain text responses
  - [HTML Format](https://docs-deserve.neabyte.com/en/response/html) - HTML content responses
  - [File Downloads](https://docs-deserve.neabyte.com/en/response/file) - Download files from filesystem
  - [Data Downloads](https://docs-deserve.neabyte.com/en/response/data) - Download in-memory content
  - [Redirects](https://docs-deserve.neabyte.com/en/response/redirect) - Redirect responses
  - [Custom Responses](https://docs-deserve.neabyte.com/en/response/custom) - Full control over response options

- **Static Files**
  - [Basic Static Serving](https://docs-deserve.neabyte.com/en/static-file/basic) - Serve static files from directories
  - [Multiple Directories](https://docs-deserve.neabyte.com/en/static-file/multiple) - Serve from multiple locations

- **Error Handling**
  - [Default Behavior](https://docs-deserve.neabyte.com/en/error-handling/default-behavior) - Automatic error handling
  - [Object Details](https://docs-deserve.neabyte.com/en/error-handling/object-details) - Detailed error information

## Contributing

**Help us make Deserve even simpler!** Every contribution helps make building APIs effortless.

### How to Contribute

- **Report Bugs** - Found something broken? Let us know via [GitHub Issues](https://github.com/NeaByteLab/Deserve/issues)
- **Suggest Features** - Have an idea that aligns with our simplicity-first philosophy? [Create an issue](https://github.com/NeaByteLab/Deserve/issues/new)
- **Fix & Improve** - Submit [Pull Requests](https://github.com/NeaByteLab/Deserve/pulls) for bug fixes, typos, or code improvements
- **Build Middleware** - Create and share third-party middleware that extends Deserve's capabilities
- **Improve Docs** - Help us make the documentation clearer (supports English and Indonesian!)
- **Use Deserve** - The best contribution? Use it in your projects and share your feedback

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
