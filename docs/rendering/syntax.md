---
description: "DVE template syntax reference: variables, conditionals, loops, and includes."
---

# Template Syntax

DVE templates are plain HTML with a small set of <code v-pre>{{ }}</code> tags for data, conditions, loops, and includes. Setup and the first render live in [Rendering Overview](/rendering/).

## Variables

A <code v-pre>{{ }}</code> tag prints a value, and member access reaches nested data:

```html
<!-- Simple variable -->
<p>{{username}}</p>

<!-- Object property -->
<p>{{user.name}}</p>

<!-- Nested property -->
<p>{{user.profile.email}}</p>
```

Lookups read only an object's own properties, so `__proto__`, `constructor`, and other inherited keys resolve to nothing. That blocks prototype pollution through user data.

## Conditionals

<code v-pre>{{#if}}</code> renders a block when the value is truthy:

```html
<!-- Simple condition -->
{{#if user.isAdmin}}
<button>Delete User</button>
{{/if}}
```

A condition pairs with <code v-pre>{{else}}</code> for the fallback branch, and blocks nest freely:

```html
{{#if posts.length > 0}}
<div class="posts">
  <!-- Loop runs when posts exist -->
  {{#each posts as post}}
  <article>{{post.title}}</article>
  {{/each}}
</div>
{{else}}
<p>No posts found.</p>
{{/if}}
```

## Loops

<code v-pre>{{#each}}</code> walks an array under an alias, with metadata variables for each pass:

```html
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

**Each metadata:**

- `@index` - Item index (0-based)
- `@first` - Boolean true if first item
- `@last` - Boolean true if last item
- `@length` - Total number of items

Each loop is capped by `maxIterations`, covered in [Performance and Limits](/rendering/performance#iteration-limit).

## Includes

The `>` operator pulls another template into the current one:

```html
<!-- Include other template with > operator -->
{{> header.dve}}

<main>
  <h1>Page Content</h1>
</main>

{{> footer.dve}}
```

Includes nest up to a fixed depth, covered in [Performance and Limits](/rendering/performance#include-depth-limit).

## Expressions

DVE supports JavaScript-like expressions for lookups and operators:

```html
<!-- Optional chaining and nullish coalescing -->
<p>Hello {{ user?.name ?? 'Guest' }}.</p>

<!-- Math operators -->
<p>Total: {{ 1 + 2 * 3 }}</p>

<!-- Comparison -->
{{#if age >= 18}}Adult{{/if}}
```

The grammar is a safe subset, not full JavaScript. These pieces are supported:

- **Member access** - `user.name`, `user.profile.email`, and optional chaining `user?.name`
- **Math** - `+`, `-`, `*`, `/`, `%`, and unary `+`, `-`, `!`
- **Comparison** - `===`, `!==`, `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logic** - `&&`, `||`, `??`, and the ternary `cond ? a : b`
- **Literals** - numbers, single or double quoted strings, `true`, `false`, `null`, `undefined`
- **Grouping** - parentheses, for example `(a + b) * c`

To keep templates safe and predictable, the engine rejects anything outside that subset and throws a parse error. Function calls like `format(price)`, bracket indexing like `items[0]`, and assignment are not allowed.

## Raw Output

Values are HTML escaped by default, and triple braces opt out for trusted markup only:

```html
<!-- Default: HTML escaped (safe from XSS) -->
<p>{{userInput}}</p>

<!-- Raw: skips HTML escape, use only trusted markup -->
<p>{{{trustedHtml}}}</p>
```

## Layout Composition

A layout is built by including smaller templates and dropping data into plain variables, so a shared shell wraps each page without any special slot mechanism:

```html
<!-- views/layouts/base.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <header>{{> header.dve}}</header>
    <main>{{{ content }}}</main>
    <footer>{{> footer.dve}}</footer>
  </body>
</html>
```

The `content` value comes from the route data, and triple braces render it as raw HTML when the markup is already trusted.
