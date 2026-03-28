# Rendering

Deserve provides a built-in template rendering engine with DVE (Deserve View Engine) for building dynamic HTML with simple syntax.

> [!INFO]
> See [DVE syntax highlighting](https://github.com/NeaByteLab/Deserve/tree/main/editor) documentation for editor support and complete syntax reference.

## View Engine

### Setup

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Create router with views directory
const router = new Router({
  viewsDir: './views' // Folder for .dve templates
})

// 3. Run server
await router.serve(8000)
```

### Basic Template

Create template in `views/` folder:

```dve
<!-- views/welcome.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <h1>Hello {{name}}!</h1>
    <p>Today: {{date}}</p>
  </body>
</html>
```

### Render in Route

```typescript
// routes/welcome.ts
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Render template with data
  return ctx.render('welcome', {
    title: 'Welcome Page',
    name: 'John Doe',
    date: new Date().toLocaleDateString()
  })
}
```

## DVE Template Syntax

### Variables

```dve
<!-- Simple variable -->
<p>{{username}}</p>

<!-- Object property -->
<p>{{user.name}}</p>

<!-- Nested property -->
<p>{{user.profile.email}}</p>
```

### Conditionals

```dve
{{#if user.isAdmin}}
<button>Delete User</button>
{{/if}} {{#if posts.length > 0}}
<div class="posts">
  <!-- Loop with alias -->
  {{#each posts as post}}
  <article>{{post.title}}</article>
  {{/each}}
</div>
{{else}}
<p>No posts found.</p>
{{/if}}
```

### Loops

```dve
{{#each users as u}}
<div class="user">
  <!-- Access property from alias -->
  <h3>{{u.name}}</h3>
  <p>{{u.email}}</p>

  <!-- Metadata variables available -->
  <small>Index: {{@index}}, First: {{@first}}, Last: {{@last}}, Total: {{@length}}</small>
</div>
{{/each}}
```

**Each Metadata:**

- `@index` - Item index (0-based)
- `@first` - Boolean true if first item
- `@last` - Boolean true if last item
- `@length` - Total number of items

### Includes

```dve
<!-- Include other template with > operator -->
{{> header.dve}}

<main>
  <h1>Page Content</h1>
</main>

{{> footer.dve}}
```

### Expressions

DVE supports JavaScript-like expressions for lookups and operators:

```dve
<!-- Optional chaining and nullish coalescing -->
<p>Hello {{ user?.name ?? 'Guest' }}.</p>

<!-- Math operators -->
<p>Total: {{ 1 + 2 * 3 }}</p>

<!-- Comparison -->
{{#if age >= 18}}Adult{{/if}}
```

### Raw Output

```dve
<!-- Default: HTML escaped (safe from XSS) -->
<p>{{userInput}}</p>

<!-- Raw: no HTML escape (be careful!) -->
<p>{{{trustedHtml}}}</p>
```

## Advanced Features

### Template Inheritance

```dve
<!-- views/layouts/base.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <!-- Include header -->
    <header>{{> header.dve}}</header>

    <main>
      {{content}}
      <!-- Content slot -->
    </main>

    <!-- Include footer -->
    <footer>{{> footer.dve}}</footer>
  </body>
</html>

<!-- views/pages/home.dve -->
{{#if content}} {{content}} {{else}}
<h1>Welcome Home!</h1>
{{/if}}
```

### Helper Functions

```typescript
// Custom helpers can be added via context state
export function GET(ctx: Context): Response {
  ctx.state.formatDate = (date: Date) => date.toLocaleDateString()
  ctx.state.formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  return ctx.render('dashboard', {
    transactions: getTransactions()
  })
}
```

```dve
<p>Date: {{formatDate(transaction.date)}}</p>
<p>Amount: {{formatCurrency(transaction.amount)}}</p>
```

## Performance

### Caching

Templates are automatically cached after first compilation:

```typescript
// First render: compiles and caches template AST
await ctx.render('template', data)

// Subsequent renders: uses cached AST version
await ctx.render('template', newData) // Fast
```

**Note**: Cache is only for template compilation, not data or backend logic.

## Error Handling

```typescript
export function GET(ctx: Context): Response {
  try {
    return ctx.render('template', data)
  } catch (error) {
    if (error.message.includes('Template not found')) {
      return ctx.send.json({ error: 'Template missing' }, { status: 404 })
    }
    return ctx.send.json({ error: 'Render failed' }, { status: 500 })
  }
}
```

DVE provides balance between simplicity and power. Simple enough for quick prototyping and capable enough for production services.
