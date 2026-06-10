---
description: 'Turn the Deserve observability bus into a compliance-grade audit trail, then pipe it to your own store, a SIEM, or a WAF.'
---

# Audit Compliance

Compliance work asks a hard question of every server: what happened, when, and can it be proven later. Deserve answers it at the source. Every subsystem fault, every finished request, and every blocked self-termination arrives on one [observability bus](/middleware/observability/overview), structured and timestamped the instant it fires.

That framing matters, so it is worth stating plainly. Deserve is not a [SIEM](https://csrc.nist.gov/glossary/term/security_information_and_event_management) and is not more durable than one. What it is, is the best-behaved SIEM *input* a framework can hand over. The data leaving the bus is cleaner and more complete than most frameworks emit, because it carries framework behaviour and application faults alike, each on a clean [internal or external channel](/middleware/observability/events) so the alert path never drowns in routine traffic. Durable storage is still on the operator, but what reaches that storage starts honest.

## What the Bus Already Captures

A single [`router.on()`](/middleware/observability/overview) listener sees the whole surface, and every event shares the same `{ type, kind, metadata, timestamp }` envelope. The kinds that matter most for an audit trail map straight onto what auditors ask for:

| Compliance need              | Events that answer it                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Who did what, when           | [`request:complete`](/middleware/observability/events#requests) with `method`, `url`, `statusCode`, `durationMs`, and optional `ip` |
| Security-relevant events     | [`session:invalid`](/middleware/observability/events#middleware), [`csrf:rule-error`](/middleware/observability/events#middleware), [`process:error`](/middleware/observability/events#process) |
| Failures and faults          | [`request:error`](/middleware/observability/events#requests), [`worker:crash`](/middleware/observability/events#workers), [`view:error`](/middleware/observability/events#views) |
| Reconstructable timeline     | Every event carries a `timestamp` in epoch milliseconds and arrives in order       |

Nothing here needs wiring inside handlers. The faults emit on their own, which is why a tampered cookie or a blocked `Deno.exit` shows up without a single line of logging in the route. The full list lives in the [Event Reference](/middleware/observability/events).

## A Compliance-Grade Listener

The audit listener has one job: capture every event as a structured record and hand it to durable storage. Filtering on `type` keeps framework faults on their own track while still recording normal traffic:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// One audit record per event
router.on((event) => {
  const record = JSON.stringify({
    at: event.timestamp,
    channel: event.type,
    kind: event.kind,
    ...event.metadata
  })
  // Internal events feed the fault channel
  if (event.type === 'internal') {
    console.error(record)
  } else {
    console.log(record)
  }
})

await router.serve(8000)
```

Each record is already JSON, already timestamped, and already labelled by `channel`. That is the shape every downstream below expects, so the same listener feeds all three options without change.

## Option 1 - Build Your Own Store

The simplest durable sink is one owned end to end. Append each record to a write-only file, ship it to object storage, or insert it into a database. A file appender keeps the audit log on disk and out of the request path:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
// Open the audit log once, append-only
const audit = await Deno.open('./audit.log', {
  create: true,
  append: true
})
const encoder = new TextEncoder()

router.on(async (event) => {
  const record = JSON.stringify({
    at: event.timestamp,
    ...event
  })
  // Append one line per event
  await audit.write(encoder.encode(record + '\n'))
})
```

Writing to disk needs the `--allow-write` flag scoped to the log, as covered in [Production Deploy](/recipes/production-deploy#locking-permissions-down). For long-term retention, ship the same records to durable object storage with the pattern in [Object Storage](/recipes/object-storage).

## Option 2 - Stream to a SIEM

A [SIEM](https://csrc.nist.gov/glossary/term/security_information_and_event_management) collects events from many systems, correlates them, and raises alerts. Most accept structured records over a plain HTTP endpoint, so the audit listener forwards each record with a single `fetch`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
const endpoint = 'https://http-inputs-acme.splunkcloud.com/services/collector/event'
const token = Deno.env.get('SIEM_TOKEN') ?? ''

router.on((event) => {
  // Forward the record to the SIEM
  void fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Splunk ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      event: {
        ...event.metadata,
        kind: event.kind
      }
    })
  })
})
```

The endpoint and auth shape follow the vendor. Common collectors with public HTTP ingest APIs include [Splunk HTTP Event Collector](https://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector), [Datadog Logs Intake](https://docs.datadoghq.com/api/latest/logs/), [Elasticsearch Bulk API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk), and any [OpenTelemetry OTLP/HTTP](https://opentelemetry.io/docs/specs/otel/protocol/exporter/) endpoint. Outbound `fetch` needs the `--allow-net` flag from [Production Deploy](/recipes/production-deploy#permission-checklist), and the call is fired without `await` so the request path stays fast.

## Option 3 - Feed a WAF Decision Loop

A [Web Application Firewall](https://owasp.org/www-community/Web_Application_Firewall) blocks bad traffic before it reaches the app, and the bus gives it signal to act on. A burst of `request:error` events from one `ip`, or repeated `csrf:rule-error` faults, is exactly the pattern a WAF rule wants. Forward the security-relevant kinds to the firewall's API to drive a block list:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  // Only forward security-relevant faults
  if (event.kind === 'csrf:rule-error' || event.kind === 'request:error') {
    void fetch('https://waf.internal/signals', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        at: event.timestamp,
        ...event.metadata
      })
    })
  }
})
```

Managed firewalls expose this through their own APIs, such as [Cloudflare WAF custom rules](https://developers.cloudflare.com/waf/custom-rules/) or the [AWS WAF API](https://docs.aws.amazon.com/waf/latest/APIReference/Welcome.html). The bus supplies the evidence, the WAF owns the verdict, and the two stay cleanly separated.

## Honest Limits

Holding the claim straight keeps the recipe trustworthy:

- **Not durable on its own.** With no listener registered, emitting is a no-op, so a fault before storage is wired is simply not recorded. Durability lives in the sink, not the bus.
- **Best effort, in process.** Events fire in real time on the server, so a hard crash between emit and write can drop the last record. The [process guard](/error-handling/defense-in-depth#layer-5-process-guard) keeps the process alive through most faults, which narrows that window but does not close it.
- **Input, not analysis.** The bus produces clean records. Correlation, retention, and alerting belong to whatever store, SIEM, or WAF receives them.

What Deserve guarantees is the part frameworks usually get wrong: the data arriving at storage is structured, timestamped at the source, split by channel, and complete across framework behaviour and application faults. Everything is auditable because everything emits.
