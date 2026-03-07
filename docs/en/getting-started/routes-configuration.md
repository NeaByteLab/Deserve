# Routes Configuration

Configure Deserve routes directory to match your project structure.

## Router Options

The `Router` constructor accepts configuration options. The main one is `routesDir` (directory for your route files):

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Set custom routesDir (default: ./routes)
const router = new Router({
  routesDir: 'src/routes'
})
```

## Configuration Options

### `routesDir`

The directory containing your route files:

```typescript
// 1. Default: routes from ./routes
const router = new Router()

// 2. Custom: routes from ./src/api
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
