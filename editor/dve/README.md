# DVE Grammar

A short, friendly tour of the Deserve `.dve` template syntax that reads from top to bottom, so the first open of a `.dve` file feels easy instead of intimidating.

- **Editor tooling overview**: See [`editor/README.md`](../README.md)

## Table of Contents

- [Install Local VSIX](#install-local-vsix)
- [Start Here](#start-here)
- [Variables](#variables)
- [Raw Output (Unescaped)](#raw-output-unescaped)
- [Include](#include)
- [If / Else](#if--else)
- [Each](#each)
- [Each Metadata](#each-metadata)
- [Expressions](#expressions)
- [Operator Reference](#operator-reference)
- [Snippets](#snippets)
- [Advanced Examples](#advanced-examples)
- [What DVE Does Not Do](#what-dve-does-not-do)
- [Editor Scope Mapping](#editor-scope-mapping)

## Install Local VSIX

This folder ships a prebuilt VSIX package, so nothing needs to be built first:

```txt
dve-language-0.1.0.vsix
```

Install it from this directory with an editor CLI:

```bash
# VS Code
code --install-extension ./dve-language-0.1.0.vsix --force

# Cursor
cursor --install-extension ./dve-language-0.1.0.vsix --force

# Trae
trae --install-extension ./dve-language-0.1.0.vsix --force
```

Reload the editor after installing, and since DVE builds on HTML syntax the `.dve` files keep full HTML highlighting with the template tags layered on top.

## Start Here

The whole language comes down to two tags, and once those land the rest is just small variations.

A `{{ ... }}` tag **shows a value** while a `{{#... }} ... {{/... }}` tag wraps a **block** like an if or a loop, and everything further down builds on those two shapes.

```txt
Hello {{ user?.name ?? 'Guest' }}.
{{#if user?.isAdmin}}ADMIN{{else}}USER{{/if}}
```

## Variables

A value wrapped in double braces is printed onto the page, and DVE escapes HTML by default so user input can never sneak in markup or open an injection hole.

```txt
Hello {{ name }}.
```

## Raw Output (Unescaped)

Triple braces print the value as-is with no escaping, which is meant only for HTML that is already known to be safe.

```txt
{{{ trustedHtml }}}
```

## Include

A repeated piece of markup can live in its own file and get pulled in with an include, where the path is resolved relative to the configured `viewsDir`.

```txt
{{> partials/header.dve}}
```

## If / Else

An `#if` block renders its body only when the condition is truthy and an optional `else` covers the other case, and every `#if` must be closed with a matching `/if` or DVE reports the block as unclosed.

```txt
{{#if ok}}YES{{else}}NO{{/if}}
```

## Each

An `#each` block walks an array and `as` names the current item, and leaving the name out falls back to `item`.

```txt
{{#each items as item}}{{ item }},{{/each}}
```

## Each Metadata

Inside an `#each` block four helpers are available for free, so the loop position never has to be tracked by hand:

- `@index` — current position, starting at 0
- `@first` — true on the first item
- `@last` — true on the last item
- `@length` — total number of items

```txt
{{#each items as item}}({{ @index }}/{{ @length }} {{#if @first}}F{{else}}-{{/if}}{{#if @last}}L{{else}}-{{/if}}={{ item }});{{/each}}
```

## Expressions

Any `{{ ... }}` tag accepts a small JavaScript-like expression, so a value can be read, given a fallback, compared, or run through a little math all in one place.

```txt
Hello {{ user?.name ?? 'Guest' }}.
Total {{ price * quantity }}
{{#if age >= 18}}Adult{{else}}Minor{{/if}}
```

A few behaviours worth knowing:

- A dotted path like `user.profile.name` reads nested values, and missing data along the way resolves to `undefined`
- Both `.` and `?.` return `undefined` when the object is missing, so a deep lookup never throws
- Strings use `"double"` or `'single'` quotes and understand the `\n`, `\t`, `\r` escapes
- Numbers can be decimals or exponents like `2.5` or `1e3`

## Operator Reference

Everything DVE understands, lowest precedence at the top down to highest at the bottom, and anything not on this list is rejected by the parser on purpose.

| Group          | Operators                                           | Example                    |
| -------------- | --------------------------------------------------- | -------------------------- |
| Ternary        | `? :`                                               | `{{ ok ? 'yes' : 'no' }}`  |
| Nullish        | `??`                                                | `{{ name ?? 'Guest' }}`    |
| Logical OR     | `\|\|`                                              | `{{ a \|\| b }}`           |
| Logical AND    | `&&`                                                | `{{ a && b }}`             |
| Equality       | `===` `!==` `==` `!=`                               | `{{ role === 'admin' }}`   |
| Relational     | `>` `<` `>=` `<=`                                   | `{{ age >= 18 }}`          |
| Additive       | `+` `-`                                             | `{{ a + b }}`              |
| Multiplicative | `*` `/` `%`                                         | `{{ total % 2 }}`          |
| Unary          | `!` `+` `-`                                         | `{{ !done }}`              |
| Member         | `.` `?.`                                            | `{{ user?.profile.name }}` |
| Grouping       | `( )`                                               | `{{ (a + b) * c }}`        |
| Literals       | numbers, strings, `true` `false` `null` `undefined` | `{{ 1 + 2 * 3 }}`          |

## Snippets

Type a prefix and press Tab to drop in the syntax that is easiest to forget.

| Prefix     | Inserts                               |
| ---------- | ------------------------------------- |
| `dve`      | `{{ value }}`                         |
| `dveraw`   | `{{{ html }}}`                        |
| `dveinc`   | `{{> partials/header.dve }}`          |
| `dveif`    | `{{#if}} ... {{else}} ... {{/if}}`    |
| `dveifn`   | multi-line `{{#if}}` block            |
| `dveeach`  | `{{#each items as item}}` block       |
| `dveeachm` | `#each` block with `@index`/`@length` |
| `dvetern`  | `{{ cond ? yes : no }}`               |
| `dvedef`   | `{{ value ?? 'fallback' }}`           |
| `dveopt`   | `{{ user?.name ?? 'Guest' }}`         |
| `dvecmt`   | `<!-- comment -->`                    |

## Advanced Examples

### Layout + Partial Composition

`views/layout.dve`:

```txt
<html>
  <body>
    {{> partials/header.dve}}
    <main>
      {{{ bodyHtml }}}
    </main>
    {{> partials/footer.dve}}
  </body>
</html>
```

`views/partials/header.dve`:

```txt
<header>
  <h1>{{ title ?? 'Untitled' }}</h1>
  {{#if user?.name}}<p>Hello {{ user.name }}.</p>{{else}}<p>Hello Guest.</p>{{/if}}
</header>
```

### Lists With Conditional Blocks

```txt
{{#if items?.length ?? 0}}
  <ul>
    {{#each items as item}}
      <li>
        {{#if item?.isPinned}}[PIN] {{/if}}
        ({{ @index + 1 }}/{{ @length }}) {{ item?.label ?? 'No label' }}
      </li>
    {{/each}}
  </ul>
{{else}}
  <p>No items.</p>
{{/if}}
```

### Nested Each (Matrix-Style)

```txt
<table>
  {{#each rows as row}}
    <tr>
      {{#each row as cell}}
        <td>{{ cell }}</td>
      {{/each}}
    </tr>
  {{/each}}
</table>
```

## What DVE Does Not Do

DVE stays small on purpose so a template can never run arbitrary code, and these limits are the safety boundary rather than missing features:

- No function or method calls
- No array indexing like `items[0]`
- No assignment or variable declarations
- No regular expressions or arbitrary JavaScript

Two guardrails also stop runaway templates, where include nesting is capped at 64 levels deep and a single `#each` is capped at 100,000 iterations, and crossing either one raises a clear error instead of hanging.

Anything that needs real logic belongs in the route handler, where the finished value gets computed and then passed into the template.

## Editor Scope Mapping

| Syntax                             | Scope                                                   |
| ---------------------------------- | ------------------------------------------------------- |
| `{{` `}}` `{{{` `}}}`              | `meta.tag.output.dve` / `meta.tag.raw.dve`              |
| `#if` `#each` `else` `/if` `/each` | `keyword.control.dve`                                   |
| `>` (include)                      | `keyword.control.include.dve`                           |
| `as` (in #each)                    | `keyword.operator.as.dve`                               |
| Include path                       | `string.unquoted.path.dve`                              |
| `true` `false` `null` `undefined`  | `constant.language.dve`                                 |
| Numbers (incl. `1e3`)              | `constant.numeric.dve`                                  |
| `"..."` `'...'`                    | `string.quoted.double.dve` / `string.quoted.single.dve` |
| Operators `?.` `===` `??` etc.     | `keyword.operator.dve`                                  |
| Identifiers / variables            | `variable.other.dve`                                    |
| Item name in #each                 | `variable.parameter.dve`                                |
