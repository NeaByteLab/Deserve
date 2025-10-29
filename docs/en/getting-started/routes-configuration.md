# Routes Configuration

Configure Deserve routes directory to match your project structure.

## Router Options

The `Router` constructor accepts a configuration option:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: 'src/routes'
})
```

## Configuration Options

### `routesDir`

The directory containing your route files:

```typescript
// Default - uses './routes'
const router = new Router()

// Custom directory - Uses './src/api'
const router = new Router({
  routesDir: 'src/api'
})
```

## Supported File Extensions

Deserve automatically detects and supports these file extensions:

- `.ts` (TypeScript)
- `.js` (JavaScript)
- `.tsx` (TypeScript with JSX)
- `.jsx` (JavaScript with JSX)
- `.mjs` (ES Modules)
- `.cjs` (CommonJS)

You don't need to configure extensions - Deserve automatically detects them.

## Absolute vs Relative Paths

### Relative Paths
```typescript
const router = new Router({
  routesDir: 'routes'
})
```

### Absolute Paths

```typescript
const router = new Router({
  routesDir: `${Deno.cwd()}/routes`
})
```

```typescript
const router = new Router({
  routesDir: '/absolute/path/to/routes'
})
```
