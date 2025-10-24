# Error Object Details

Deserve provides detailed error information through the error middleware, giving you complete context about what went wrong and how to fix it.

## Error Object Structure

The error middleware receives an error object with the following properties:

```typescript
type ErrorMiddleware = (
  req: Request,
  error: {
    path: string        // Full request URL
    method: string      // HTTP method (GET, POST, etc.)
    statusCode: number  // HTTP status code (404, 500, 501, etc.)
    error?: Error       // Full Error object (for 500 errors)
  }
) => Response | null
```

## Error Properties

### `path`
The full request URL that caused the error:

```typescript
router.onError((req, error) => {
  console.log('Error path:', error.path)
  // Example: "https://example.com/api/users/123"
})
```

### `method`
The HTTP method of the request:

```typescript
router.onError((req, error) => {
  console.log('Error method:', error.method)
  // Example: "GET", "POST", "PUT", etc.
})
```

### `statusCode`
The HTTP status code indicating the type of error:

```typescript
router.onError((req, error) => {
  switch (error.statusCode) {
    case 404:
      console.log('Route not found')
      break
    case 500:
      console.log('Internal server error')
      break
    case 501:
      console.log('Method not allowed')
      break
  }
})
```

### `error` (Optional)
The full Error object for 500 errors (uncaught exceptions):

```typescript
router.onError((req, error) => {
  if (error.error) {
    console.log('Error message:', error.error.message)
    console.log('Error name:', error.error.name)
    console.log('Stack trace:', error.error.stack)
  }
})
```

## Error Types

### 404 - Route Not Found
```typescript
router.onError((req, error) => {
  if (error.statusCode === 404) {
    return Send.json({
      error: 'Not Found',
      path: error.path,
      method: error.method,
      timestamp: new Date().toISOString()
    }, { status: 404 })
  }
  return null
})
```

### 500 - Internal Server Error
```typescript
router.onError((req, error) => {
  if (error.statusCode === 500) {
    return Send.json({
      error: 'Internal Server Error',
      message: error.error?.message || 'Something went wrong',
      path: error.path,
      method: error.method,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
  return null
})
```

### 501 - Method Not Allowed
```typescript
router.onError((req, error) => {
  if (error.statusCode === 501) {
    return Send.json({
      error: 'Method Not Allowed',
      method: error.method,
      path: error.path,
      allowedMethods: ['GET', 'POST'] // Custom info
    }, { status: 501 })
  }
  return null
})
```

## Error Logging

Log detailed error information for debugging:

```typescript
router.onError((req, error) => {
  // Log error details
  console.error('Error occurred:', {
    path: error.path,
    method: error.method,
    statusCode: error.statusCode,
    message: error.error?.message,
    stack: error.error?.stack
  })

  // Return custom response
  return Send.json({
    error: 'Something went wrong',
    timestamp: new Date().toISOString()
  }, { status: error.statusCode })
})
```

## Environment-Based Error Handling

Show different error details based on environment:

```typescript
const isDevelopment = Deno.env.get('NODE_ENV') === 'development'

router.onError((req, error) => {
  const errorResponse = {
    error: 'Something went wrong',
    timestamp: new Date().toISOString()
  }

  // Include detailed error info in development
  if (isDevelopment && error.error) {
    errorResponse.details = {
      message: error.error.message,
      stack: error.error.stack,
      path: error.path,
      method: error.method
    }
  }

  return Send.json(errorResponse, { status: error.statusCode })
})
```

## Error Monitoring

Send errors to monitoring services:

```typescript
router.onError(async (req, error) => {
  // Send to monitoring service
  if (error.statusCode >= 500) {
    await sendToMonitoring({
      path: error.path,
      method: error.method,
      statusCode: error.statusCode,
      message: error.error?.message,
      stack: error.error?.stack,
      timestamp: new Date().toISOString()
    })
  }

  // Return user-friendly response
  return Send.json({
    error: 'Something went wrong',
    timestamp: new Date().toISOString()
  }, { status: error.statusCode })
})
```

## Best Practices

1. **Log errors** - Always log error details for debugging
2. **Environment awareness** - Show different details per environment
3. **User-friendly messages** - Don't expose internal details to users
4. **Monitor errors** - Send critical errors to monitoring services
5. **Consistent format** - Use the same error response format
6. **Include timestamps** - Add timestamps for error tracking
7. **Handle all status codes** - Don't ignore any error types

## Next Steps

- [Global Middleware](/middleware/global) - Cross-cutting functionality
- [Route-Specific Middleware](/middleware/route-specific) - Targeted middleware
- [Basic Static Serving](/static-file/basic) - Static file serving
