# Asynchronous behaviour and errors

## Error contracts

Choose one explicit error contract at each boundary. A discriminated result is useful when callers must handle expected alternatives; exceptions remain appropriate for failures propagated through an exception-based API. Do not wrap every function in a generic result solely for stylistic uniformity.

Treat caught values as `unknown` and narrow them before reading properties. Preserve the original error or cause when adding context. Distinguish parse, validation, cancellation, transport, HTTP, and application failures where callers need different actions; a broad catch should not relabel a programming error as malformed user input.

For `fetch`, an HTTP error status such as 4xx or 5xx still fulfils with a `Response`; check `response.ok` or `response.status` before parsing or treating it as success. Request, network and abort failures reject, while body-reading or JSON parsing can fail after a response arrives, so preserve those as distinct causes.

Handle errors at the layer that can resolve them or map them to the consumer's contract. Logging and returning an empty collection or `undefined` can erase a failure and falsely report success. Keep user-facing errors actionable without exposing private payloads.

When diagnostics are needed, use the existing reporting path with structured context permitted by the application's privacy policy. Review nested error causes as well as top-level fields for sensitive data. A logger is not a reason to retain raw payloads or add a telemetry dependency.

## Cancellation and deadlines

A `Promise.race` timeout stops waiting; it does not cancel the underlying operation. Pass cancellation to work that supports it, release timers/listeners in every completion path, and handle a signal already aborted when the operation begins. When an operation cannot be cancelled, prevent its late results from mutating obsolete state.

When asynchronous work can overlap, be superseded, or outlive its owning context, guard its state writes with the operation's identity, including error and loading updates in `catch`/`finally`. A stale operation's cleanup must not clear the state of a newer one. Aborting a client request does not prove that a server mutation was rolled back.

Give detached work a visible owner, rejection handling, and a shutdown/disposal path. Prefixing an expression with `void` does not catch a rejected promise.

## Concurrency and retries

`Promise.all` consumes an iterable of values, promises or thenables; it neither limits concurrency nor cancels sibling work on rejection. Work started while constructing the iterable is already running. `allSettled` records outcomes but still requires callers to handle failures. For potentially large collections, bound active work and retained results rather than constructing one pending promise per item.

`Promise.race` settles on the first settlement, including rejection. `Promise.any` selects the first fulfilment and rejects with `AggregateError` if all inputs reject. Choose according to the required failure contract.

Validate concurrency limits and preserve ordering only when it is part of the consumer contract. Use explicit status to represent failure: rejection reasons can be any value, including `undefined`, so that value cannot also mean “no failure.”

Retry only failures the contract classifies as retryable. Define maximum attempts, deadline, backoff, cancellation, and idempotency. A timeout is not evidence that a mutation did not commit; follow the operation's identity and reconciliation contract before retrying it. A generic network retry helper must not override those semantics.

For debounce, throttle, polling, and caching helpers, specify observable semantics before implementation: returned promises, errors, leading/trailing execution, cancellation, invalidation, capacity, and disposal. Avoid adding a generic helper until its actual consumers need that contract.

## Sources

- [TypeScript unknown catch variables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html)
- [DOM AbortController and AbortSignal](https://dom.spec.whatwg.org/#aborting-ongoing-activities)
- [ECMAScript promise combinators](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all)
- [Fetch API](https://fetch.spec.whatwg.org/#fetch-api)
