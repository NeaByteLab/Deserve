# File Downloads

The `Send.file()` method creates download responses from files on the filesystem.

## Basic Usage

```typescript
import { Send } from '@neabyte/deserve'

export async function GET(req: Request): Response {
  return await Send.file('./uploads/document.pdf', 'monthly-report.pdf')
}
```

## With Absolute Paths

```typescript
export async function GET(req: Request): Response {
  return await Send.file(`${Deno.cwd()}/downloads/sample.txt`, 'hello-world.txt')
}
```

## Auto-Generated Filename

```typescript
export async function GET(req: Request): Response {
  // Filename will be extracted from the file path
  return await Send.file('./uploads/report.pdf')
}
```

## With Custom Headers

```typescript
export async function GET(req: Request): Response {
  return await Send.file(
    './uploads/document.pdf',
    'custom-name.pdf',
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Custom-Header': 'value'
      }
    }
  )
}
```

## Dynamic File Downloads

```typescript
// routes/downloads/[filename].ts
export async function GET(req: Request, params: Record<string, string>): Response {
  const { filename } = params
  // Validate filename to prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return Send.json({ error: 'Invalid filename' }, { status: 400 })
  }
  try {
    return await Send.file(`${Deno.cwd()}/downloads/${filename}`)
  } catch (error) {
    return Send.json({ error: 'File not found' }, { status: 404 })
  }
}
```

## File Type Detection

```typescript
export async function GET(req: Request): Response {
  const url = new URL(req.url)
  const fileType = url.searchParams.get('type') || 'pdf'
  const fileMap = {
    pdf: './uploads/document.pdf',
    doc: './uploads/document.doc',
    txt: './uploads/document.txt'
  }
  const filePath = fileMap[fileType as keyof typeof fileMap]
  if (!filePath) {
    return Send.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  return await Send.file(filePath, `document.${fileType}`)
}
```

## Error Handling

```typescript
export async function GET(req: Request): Response {
  try {
    return await Send.file('./uploads/document.pdf', 'report.pdf')
  } catch (error) {
    return Send.json(
      { error: 'File not found or cannot be read' },
      { status: 404 }
    )
  }
}
```

## Multiple File Types

```typescript
export async function GET(req: Request): Response {
  const url = new URL(req.url)
  const format = url.searchParams.get('format') || 'pdf'
  const files = {
    pdf: './reports/monthly-report.pdf',
    excel: './reports/monthly-report.xlsx',
    csv: './reports/monthly-report.csv'
  }
  const filePath = files[format as keyof typeof files]
  if (!filePath) {
    return Send.json({ error: 'Unsupported format' }, { status: 400 })
  }
  return await Send.file(filePath, `monthly-report.${format}`)
}
```

## When to Use File Downloads

- **Static files** - Documents, images, archives
- **User uploads** - Files uploaded by users
- **Generated reports** - PDF reports, Excel files
- **Media files** - Images, videos, audio
- **Backup files** - Database dumps, configuration files

## Parameters

- `filePath` - Path to the file on the filesystem
- `filename` - Optional custom filename for download (defaults to file basename)
- `options` - Additional ResponseInit options (optional)

## Security Considerations

- **Validate file paths** - Prevent directory traversal attacks
- **Check file permissions** - Ensure files are readable
- **Sanitize filenames** - Remove dangerous characters
- **Use absolute paths** - Avoid relative path confusion

## Example Security Implementation

```typescript
export async function GET(req: Request, params: Record<string, string>): Response {
  const { filename } = params
  // Security checks
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return Send.json({ error: 'Invalid filename' }, { status: 400 })
  }
  // Only allow specific file extensions
  const allowedExtensions = ['.pdf', '.txt', '.jpg', '.png']
  const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext))
  if (!hasValidExtension) {
    return Send.json({ error: 'File type not allowed' }, { status: 400 })
  }
  try {
    return await Send.file(`${Deno.cwd()}/downloads/${filename}`)
  } catch (error) {
    return Send.json({ error: 'File not found' }, { status: 404 })
  }
}
```

## Next Steps

- [JSON Responses](/response/json) - Structured data responses
- [Text Responses](/response/text) - Plain text responses
- [Static File Serving](/static-file/basic) - Serve static files
