# DVE Grammar

Quick reference for Deserve `.dve` template syntax.

- **Editor tooling overview**: See [`editor/README.md`](../README.md)

## Table of Contents

- [DVE Scope Mapping](#dve-scope-mapping)
- [Syntax Overview](#syntax-overview)
- [Variables](#variables)
- [Raw Output (Unescaped)](#raw-output-unescaped)
- [Include](#include)
- [If / Else](#if--else)
- [Each](#each)
- [Each Metadata](#each-metadata)
- [Expressions](#expressions)
- [Advanced Examples](#advanced-examples)
- [Escaping Rules](#escaping-rules)

## DVE Scope Mapping

| Syntax                             | Scope                                                   |
| ---------------------------------- | ------------------------------------------------------- |
| `{{` `}}` `{{{` `}}}`              | `meta.tag.dve` / `meta.tag.raw.dve`                     |
| `#if` `#each` `else` `/if` `/each` | `keyword.control.dve`                                   |
| `>` (include)                      | `keyword.control.include.dve`                           |
| `as` (in #each)                    | `keyword.operator.as.dve`                               |
| Include path                       | `string.unquoted.path.dve`                              |
| `true` `false` `null` `undefined`  | `constant.language.dve`                                 |
| Numbers                            | `constant.numeric.dve`                                  |
| `"..."` `'...'`                    | `string.quoted.double.dve` / `string.quoted.single.dve` |
| Operators `?.` `===` `??` etc.     | `keyword.operator.dve`                                  |
| Identifiers / variables            | `variable.other.dve`                                    |
| Item name in #each                 | `variable.parameter.dve`                                |

## Syntax Overview

DVE uses `{{ ... }}` for expressions and `{{#...}} ... {{/...}}` for blocks.

```txt
Hello {{ user?.name ?? 'Guest' }}.
{{#if user?.isAdmin}}ADMIN{{else}}USER{{/if}}
```

## Variables

Use `{{ value }}` to print a value. Output is escaped by default.

```txt
Hello {{ name }}.
```

## Raw Output (Unescaped)

Use triple braces to skip escaping.

```txt
{{{ html }}}
```

## Include

Include another template using `{{> path }}`. The path is relative to `viewsDir`.

```txt
{{> partials/header.dve}}
```

## If / Else

Inline if/else:

```txt
{{#if ok}}YES{{else}}NO{{/if}}
```

## Each

Loop an array with `#each`.

```txt
{{#each items as item}}{{ item }},{{/each}}
```

## Each Metadata

Inside `#each`, you can use:

- `@index`
- `@first`
- `@last`
- `@length`

```txt
{{#each items as item}}({{ @index }}/{{ @length }} {{#if @first}}F{{else}}-{{/if}}{{#if @last}}L{{else}}-{{/if}}={{ item }});{{/each}}
```

## Expressions

DVE supports JS-like expressions for lookups and basic operators.

Notes:

- `.` and `?.` both return `undefined` for nullish objects
- Block tags must be balanced (`#if`/`/if`, `#each`/`/each`)

```txt
Hello {{ user?.name ?? 'Guest' }}.
Sum={{ 1 + 2 * 3 }}
```

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

### Safe Vs Raw Output

```txt
Escaped: {{ userInput }}
Raw: {{{ trustedHtml }}}
```

## Escaping Rules

- `{{ value }}` escapes HTML by default
- `{{{ value }}}` outputs raw HTML (no escaping)
