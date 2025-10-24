# HTML Responses

The `Send.html()` method creates HTML responses.

## Basic Usage

```typescript
import { Send } from '@neabyte/deserve'

export function GET(req: Request): Response {
  return Send.html('<h1>Welcome</h1><p>Hello World!</p>')
}
```

## Complete HTML Page

```typescript
export function GET(req: Request): Response {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deserve API</title>
</head>
<body>
  <h1>Welcome to Deserve</h1>
  <p>Your API is running successfully!</p>
  <ul>
    <li><a href="/users">Users</a></li>
    <li><a href="/docs">Documentation</a></li>
  </ul>
</body>
</html>
  `.trim()
  return Send.html(html)
}
```

## With Status Codes

```typescript
export function GET(req: Request): Response {
  return Send.html(
    '<h1>404 - Page Not Found</h1>',
    { status: 404 }
  )
}
```

## Dynamic Content

```typescript
export function GET(req: Request, params: Record<string, string>) {
  const { id } = params
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>User ${id}</title>
</head>
<body>
  <h1>User Profile</h1>
  <p>User ID: ${id}</p>
  <p>Name: User ${id}</p>
  <p>Email: user${id}@example.com</p>
</body>
</html>
  `.trim()
  return Send.html(html)
}
```

## Error Pages

```typescript
export function GET(req: Request): Response {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Server Error</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .error { color: #d32f2f; }
  </style>
</head>
<body>
  <h1 class="error">500 - Internal Server Error</h1>
  <p>Something went wrong. Please try again later.</p>
</body>
</html>
  `.trim()
  return Send.html(html, { status: 500 })
}
```

## When to Use HTML Responses

- **Web pages** - Serve HTML directly
- **Error pages** - Custom 404/500 pages
- **Documentation** - API docs or help pages
- **Simple UIs** - Basic web interfaces

## Next Steps

- [Data Downloads](/response/data) - Download generated content
- [File Downloads](/response/file) - Download files from filesystem
- [Error Handling](/error-handling/object-details) - Handle errors properly
