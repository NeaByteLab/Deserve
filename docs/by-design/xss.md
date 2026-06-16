---
description: "Why Deserve has no XSS input sanitizer middleware, since escaping belongs at output and the view engine already does it."
---

# XSS Input Sanitizer

Deserve has no input sanitizer middleware, and that is the safer default. Cross-site scripting is stopped by escaping at the moment a value is rendered, which the [view engine](/rendering/syntax) already does on its own.

## Why It Is Not Built In

An input sanitizer scrubs incoming `body`, `query`, and `params` of HTML before the handler sees them, the job of packages like the now deprecated `xss-clean`. The approach is the wrong layer, and [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) recommends context-aware output encoding instead of blanket input cleaning.

The reason is that escaping depends on where a value lands. The same character is encoded one way inside HTML, another inside a URL, and another inside JavaScript. A sanitizer at the door cannot know that yet, so it either strips too much and corrupts real data, like a comment that contains `<3` or a code sample, or strips too little and leaves a gap. Cleaning input once also gives a false sense of safety, since the stored value still has to be escaped wherever it is later shown.

## Escaping Happens at Render

The right place to escape is the point of output, and that is built into DVE. A value in double braces is HTML escaped every time, so data from a form or a database renders as text and never as markup.

```html
<!-- Escaped by default, safe from XSS -->
<p>{{ comment }}</p>
```

Because the escape runs at render, the raw value stays intact in storage and in the API, and only the HTML view turns it into entities. This is the same `escapeHtml` step the framework uses for error pages, so the behaviour is consistent across the surface. The full rules live in [Raw Output](/rendering/syntax#raw-output).

## Opting Out for Trusted Markup

Some values are meant to be HTML, such as content from a trusted editor. Triple braces skip the escape for that one value, an explicit choice rather than a global setting.

```html
<!-- Raw HTML, trusted markup only -->
<p>{{{ trustedHtml }}}</p>
```

The opt-out is deliberate and local, so the default stays safe and only the value that needs raw markup is marked as such. Sending JSON needs no escaping at all, since the data is never parsed as markup, covered in [JSON responses](/response/json). Checking the shape and type of incoming data is a separate task that runs before the handler through a [validation](/middleware/validation/overview) contract, which is validation rather than escaping.
