# Custom Configuration

Configure Deserve to match your project structure.

## Router Options

The `Router` constructor accepts configuration options:

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router with custom configuration
const router = new Router({
  prefix: 'src/routes',  // Custom routes directory
  extension: '.ts'       // File extension for routes
})
```


## Configuration Options

### `prefix`
The directory containing your route files:

```typescript
// Default
const router = new Router() // Uses './routes'

// Custom
const router = new Router({
  prefix: 'src/api'  // Uses './src/api'
})
```

### `extension`
The file extension for route files:

```typescript
// Default
const router = new Router() // Uses '.ts'

// Custom
const router = new Router({
  extension: '.js'  // Uses '.js' files
})
```

## Supported Extensions

Deserve supports these file extensions:

- `.ts` (TypeScript - default)
- `.js` (JavaScript)
- `.tsx` (TypeScript with JSX)
- `.jsx` (JavaScript with JSX)
- `.mjs` (ES Modules)
- `.cjs` (CommonJS)

## Absolute vs Relative Paths

### Relative Paths
```typescript
const router = new Router({
  prefix: 'routes'  // Relative to current working directory
})
```

### Absolute Paths
```typescript
const router = new Router({
  prefix: '/absolute/path/to/routes'  // Absolute path
})
```

## Error Handling

Invalid configuration will throw errors:

```typescript
// ❌ Missing required options
const router = new Router({
  prefix: 'routes'
  // Missing 'extension'
}) // Throws: "Router requires both prefix and extension options"

// ❌ Invalid extension
const router = new Router({
  prefix: 'routes',
  extension: '.py'  // Not supported
}) // Throws: "Invalid extension: .py"
```

## Next Steps

- [Basic Routes](/getting-started/quick-start) - Learn about static routes
- [Dynamic Routes](/core-concepts/file-based-routing) - Handle URL parameters
- [Middleware](/middleware/global) - Add request processing
