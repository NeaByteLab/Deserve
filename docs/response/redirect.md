# Redirects

The `Send.redirect()` method creates redirect responses.

## Basic Redirect

```typescript
import { Send } from '@neabyte/deserve'

export function GET(req: Request): Response {
  return Send.redirect('/dashboard')
}
```

## With Status Codes

```typescript
export function POST(req: Request): Response {
  // Permanent redirect (301)
  return Send.redirect('/success', 301)
}

export function GET(req: Request): Response {
  // Temporary redirect (302) - default
  return Send.redirect('/new-location')
}
```

## Common Status Codes

```typescript
// 301 - Permanent redirect
return Send.redirect('/new-url', 301)

// 302 - Temporary redirect (default)
return Send.redirect('/temporary-url')

// 303 - See Other (after POST)
return Send.redirect('/result', 303)

// 307 - Temporary redirect (preserves method)
return Send.redirect('/api/v2/users', 307)

// 308 - Permanent redirect (preserves method)
return Send.redirect('/api/v2/users', 308)
```

## After Form Submission

```typescript
export function POST(req: Request): Response {
  // Process form data...
  const formData = await req.formData()

  // Redirect to success page
  return Send.redirect('/success', 303)
}
```

## Conditional Redirects

```typescript
export function GET(req: Request): Response {
  const url = new URL(req.url)
  const returnTo = url.searchParams.get('returnTo')
  if (returnTo) {
    return Send.redirect(returnTo)
  }
  return Send.redirect('/dashboard')
}
```

## External Redirects

```typescript
export function GET(req: Request): Response {
  return Send.redirect('https://github.com/NeaByteLab/Deserve')
}
```

## When to Use Redirects

- **After POST** - Redirect to prevent duplicate submissions
- **URL changes** - Permanent redirects for moved content
- **Authentication** - Redirect to login/success pages
- **API versioning** - Redirect to newer API versions

## Next Steps

- [JSON Responses](/response/json) - Structured data
- [Text Responses](/response/text) - Plain text
- [HTML Responses](/response/html) - Rich content
