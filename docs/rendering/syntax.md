---
description: "DVE template syntax reference: variables, conditionals, loops, layouts, and expressions."
---

# Template Syntax

DVE templates are plain HTML with a small set of <code v-pre>{{ }}</code> tags for data, comments, conditions, loops, includes, and layouts. Setup and the first render live in [Rendering Overview](/rendering/), and everything that goes inside a printing tag is detailed in [Expressions](#expressions).

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

Lookups read only an object's own properties, so `__proto__`, `constructor`, and other inherited keys resolve to nothing. That blocks prototype pollution through user data. A missing value anywhere along the path resolves to an empty string.

## Comments

A DVE comment is written as <code v-pre>{{!-- text --}}</code> and is stripped during parsing, so it never reaches the output. A normal `<!-- text -->` HTML comment is left untouched and still ships in the response. Reach for the DVE form to hide notes from the client.

## Conditionals

<code v-pre>{{#if}}</code> renders a block when the value is truthy, and every <code v-pre>{{#if}}</code> closes with <code v-pre>{{/if}}</code>:

```html
<!-- Simple condition -->
{{#if user.isAdmin}}
<button>Delete User</button>
{{/if}}
```

The <code v-pre>{{else if}}</code> and <code v-pre>{{else}}</code> branches are optional, and blocks nest freely:

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

A chain adds <code v-pre>{{else if condition}}</code> before the final <code v-pre>{{else}}</code>, and each branch is tested in order until one matches.

## Loops

<code v-pre>{{#each}}</code> walks an array under an alias, and the alias defaults to `item` when the `as name` part is omitted:

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

An optional <code v-pre>{{else}}</code> renders when the array is empty or missing:

```html
{{#each users as u}}
<p>{{u.name}}</p>
{{else}}
<p>No users yet.</p>
{{/each}}
```

**Each metadata:**

- `@index` - Item index, starting at 0, and it accepts arithmetic such as <code v-pre>{{@index + 1}}</code>
- `@first` - Boolean true on the first item
- `@last` - Boolean true on the last item
- `@length` - Total number of items

Each loop is capped by `maxIterations`, and the running total across the page is capped by `maxRenderIterations`. Both live in [Performance and Limits](/rendering/performance#iteration-limit).

## Includes

The `>` operator pulls another template into the current one. The path is the exact text in the tag, which Deserve resolves against the views directory:

```html
<!-- Include other template with > operator -->
{{> header.dve}}

<main>
  <h1>Page Content</h1>
</main>

{{> footer.dve}}
```

Includes nest up to a fixed depth, covered in [Performance and Limits](/rendering/performance#include-depth-limit).

## Layouts

A layout is a shared shell that pages plug into. The layout marks named placeholders with a slot tag, and a page extends it and fills each placeholder with a block tag.

Define the shell, with each slot carrying optional default content:

```html
<!-- views/layouts/main.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{#slot title}}Untitled{{/slot}}</title>
  </head>
  <body>
    <main>{{#slot body}}{{/slot}}</main>
  </body>
</html>
```

Then a page extends the layout with the `<` operator and fills the slots by name. The extend tag opens with <code v-pre>{{&lt; layout/path}}</code>, each <code v-pre>{{#block name}}</code> fills a matching slot, and a bare <code v-pre>{{/}}</code> closes the layout:

<div v-pre>

```html
{{< layouts/main.dve}}
  {{#block title}}Home{{/block}}
  {{#block body}}<p>Welcome.</p>{{/block}}
{{/}}
```

</div>

A slot renders its own default when no matching block is provided. A block that names a slot the layout never declared is rejected with an error, which catches a typo before it ships silently. The layout chain shares the include depth cap in [Performance and Limits](/rendering/performance#include-depth-limit).

## Whitespace Control

A `~` next to the braces trims the whitespace touching that side of the tag, which keeps generated HTML tidy without reshaping the template:

<div v-pre>

```html
{{#each items as item~}}
  {{item}}
{{~/each}}
```

</div>

The `~` works on any tag, including the printing, raw, and block tags.

## Raw Output

Values are HTML escaped by default, and triple braces opt out for trusted markup only:

```html
<!-- Default: HTML escaped (safe from XSS) -->
<p>{{userInput}}</p>

<!-- Raw: skips HTML escape, trusted markup only -->
<p>{{{trustedHtml}}}</p>
```

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

- **Member access** - `user.name`, `user.profile.email`, and optional chaining `user?.name`, both null-safe
- **Math** - `+`, `-`, `*`, `/`, `%`, and unary `+`, `-`, `!`
- **Comparison** - `===`, `!==`, `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logic** - `&&`, `||`, `??`, and the ternary `cond ? a : b`
- **Literals** - numbers including exponents like `1e3`, single or double quoted strings, `true`, `false`, `null`, `undefined`
- **Grouping** - parentheses, for example `(a + b) * c`

String literals understand escape sequences `\n`, `\t`, `\r`, `\b`, `\f`, `\v`, `\0`, `\\`, `\"`, `\'`, and `\/`, plus code-point escapes `\xNN`, `\uNNNN`, and `\u{...}`.

To keep templates safe and predictable, the engine rejects anything outside that subset and throws a parse error. Function calls like `format(price)`, bracket indexing like `items[0]`, assignment, and regular expressions are not allowed. Anything that needs real logic belongs in the route handler, where the finished value is computed and passed into the template through the render data.
