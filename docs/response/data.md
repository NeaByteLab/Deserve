# Data Downloads

The `Send.data()` method creates download responses from in-memory data (strings or binary data) with proper headers and filename handling.

## Basic Usage

```typescript
import { Send } from '@neabyte/deserve'

export function GET(req: Request): Response {
  const csvData = 'name,email\nJohn,john@example.com\nJane,jane@example.com'
  return Send.data(csvData, 'users.csv', undefined, 'text/csv')
}
```

## String Data

```typescript
export function POST(req: Request): Response {
  const jsonData = JSON.stringify({ users: ['alice', 'bob'] }, null, 2)
  return Send.data(jsonData, 'users.json', undefined, 'application/json')
}
```

## Binary Data

```typescript
export function GET(req: Request): Response {
  const binaryData = new Uint8Array([1, 2, 3, 4, 5])
  return Send.data(binaryData, 'data.bin')
}
```

## With Custom Headers

```typescript
export function GET(req: Request): Response {
  const content = 'Hello World!'
  return Send.data(
    content,
    'hello.txt',
    {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Custom-Header': 'value'
      }
    },
    'text/plain'
  )
}
```

## CSV Export Example

```typescript
export function GET(req: Request): Response {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]
  const csvData = 'id,name,email\n' +
    users.map(user => `${user.id},${user.name},${user.email}`).join('\n')
  return Send.data(csvData, 'users.csv', undefined, 'text/csv')
}
```

## JSON Export Example

```typescript
export function GET(req: Request): Response {
  const data = {
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ],
    timestamp: new Date().toISOString()
  }
  return Send.data(
    JSON.stringify(data, null, 2),
    'export.json',
    undefined,
    'application/json'
  )
}
```

## When to Use Data Downloads

- **Generated content** - CSV exports, reports, logs
- **API responses** - When you want to force download instead of display
- **Binary data** - Images, documents, archives
- **Dynamic files** - Content generated from database queries
- **Export functionality** - User data exports, backup files

## Parameters

- `data` - The content to download (string or Uint8Array)
- `filename` - The filename for the download
- `options` - Additional ResponseInit options (optional)
- `contentType` - MIME type (default: 'application/octet-stream')

## Next Steps

- [File Downloads](/response/file) - Download files from filesystem
- [HTML Responses](/response/html) - Rich HTML content
- [Redirects](/response/redirect) - Redirect responses
