# Deserve [![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE) [![Deno](https://img.shields.io/badge/Deno-2.5.4-blue)](https://deno.land) [![JSR](https://jsr.io/badges/@neabyte/deserve)](https://jsr.io/@neabyte/deserve)

HTTP server with file-based routing for Deno that supports middleware and dynamic routing.

## Installation

```bash
deno add jsr:@neabyte/deserve
```

## Example

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Start the server
router.serve(8000)
```

Create route files in your `routes` directory. For example, create a `routes/index.ts` file:

```typescript
import { Send } from '@neabyte/deserve'

// GET request to / -> returns a JSON response with a message
export function GET(req: Request): Response {
  return Send.json({ message: 'Hello World' })
}
```

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/NeaByteLab/Deserve/pulls).

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
