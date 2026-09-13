# Practical React review

Use these questions on changed behavior and affected callers. They are review criteria, not requirements to adopt a library or rewrite working architecture. Sources were reviewed on 2026-09-13; use the consumer's actual React/framework versions and supplied evidence.

## Component and state contracts

- Locate the owner of each changing value and follow props, callbacks and context through consumers. Look for duplicated derived state, contradictory status flags, accidental prop-to-state synchronization, or shared mutable objects that permit inconsistent outcomes. Separate intentionally editable drafts from derived data. Prefer a single authoritative decision over duplicated business logic; similar JSX does not require extraction. See [Thinking in React](https://react.dev/learn/thinking-in-react) and [choosing state structure](https://react.dev/learn/choosing-the-state-structure).
- Check that rendering remains repeatable and does not mutate props/state or perform externally visible work. Check Hook call sites against the installed API's rules, including documented exceptions such as `use`; a blanket prohibition on every conditional `use` call is incorrect. Custom Hooks share logic, not automatically the same state instance. Respect legitimate existing class components. See [Rules of React](https://react.dev/reference/rules) and [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- Follow state identity across insertion, deletion, reorder, navigation and entity changes. Unstable keys or nested component definitions can reset state; index keys are a problem when actual item identity can shift, not automatically for a fixed list. Check whether preserved or reset form state matches the intended user action. See [preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state).

## Effects and asynchronous behavior

Effects synchronize with external systems. Identify that system, captured reactive values and cleanup ownership. Inspect subscriptions, timers and requests across dependency changes and unmounts. Trace stale closures and a concrete out-of-order completion: an older response must not overwrite newer state. Cancellation or ignoring obsolete results can be appropriate; neither is a universal requirement for every promise. See [useEffect](https://react.dev/reference/react/useEffect).

Deriving values during rendering or handling an explicit user action in its event handler can avoid unnecessary synchronization and duplicate side effects. Preserve real synchronization needs rather than banning Effects. Strict Mode's development checks are not evidence of duplicate production execution; disabling those checks or suppressing dependency warnings without addressing the cause is not a repair. See [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).

Follow pending, success, empty, error and retry states through the actual interaction. Check duplicate submissions, optimistic rollback and overlapping requests where present. Do not demand a new fetching/state library when the current design can safely own the behavior.

## Web, server and client boundaries

- Check labels, keyboard access, focus preservation, validation feedback and controlled/uncontrolled input transitions. Associate errors with their fields and ensure pending controls do not strand the user. Share DOM/CSS concerns with the front-end reviewer; source inspection cannot establish browser behavior. React's [input reference](https://react.dev/reference/react-dom/components/input) explains input ownership and labels.
- If server rendering is used, compare initial server/client output and state. Look for environment-dependent rendering, browser-only access on the server and broad hydration-warning suppression. Intentional client-only content is valid when the framework handles it explicitly. See [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot).
- If Server Functions/Actions or Server Components are used, trace serialization and access boundaries. Client-supplied arguments require server-side validation and authorization; a hidden button or server directive is not an authorization check. Check private data crossing to the client and cross-user cache state against the real framework contract. See ['use server'](https://react.dev/reference/rsc/use-server). Coordinate security findings with the mandatory security gate; do not infer safety from TypeScript types or React rendering alone.
- Trace untrusted content passed to `dangerouslySetInnerHTML` or imperative DOM code; normal JSX text escaping does not protect these paths. Identify the actual sanitizer/trust boundary rather than assuming the API is always unsafe or always safe. See [common DOM props](https://react.dev/reference/react-dom/components/common).
- Where error boundaries or Suspense are used, verify the intended loading/error fallback and recovery path. Error boundaries do not generally handle event-handler or detached asynchronous failures; follow those errors separately. Do not require a boundary around every component. See [error boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).

## Quality evidence and performance

Use existing exact-source CI, lint/type checks and tests. Assess assertions about rendered outcomes and user actions, including relevant races, rerenders and failures. Tests that only assert internal Hook calls or broad snapshots may miss the changed contract. Prefer accessible queries and realistic interactions when the project uses Testing Library, following its [guiding principles](https://testing-library.com/docs/guiding-principles/); equivalent tools are acceptable. Do not install a preferred runner, automatically approve snapshots or rerun suites already covered by supplied CI.

React web impact requires the separate browser gate. Provide the Captain concrete checkpoints such as typing during a delayed response, changing entity while editing, or submitting and recovering from an error. The reviewer itself has read-only source/evidence permissions.

Report performance problems from an observed expensive path, unbounded work or supplied profiling evidence. Routine rerenders and inline callbacks are not defects. Memoization is an optimization, not a correctness guarantee; account for actual compiler configuration and comparator behavior before proposing it. See [memo](https://react.dev/reference/react/memo).

## Calibration

- A slow previous search result replaces the latest query's results: identify the request/state sequence and missing ownership guard. Fetching in an Effect alone is not a finding.
- A reorder moves an edited value to a different record because keys track position: show the affected list and state. Index keys in an immutable decorative list alone are not a finding.
- A mutation action trusts a caller's account ID without checking access: report the server boundary. Choosing Context instead of a preferred store is not a finding.

These examples calibrate judgment; they are not executed model evaluations. Cite a concrete consequence, keep optional improvements advisory, and accept a no-findings result when supported.
