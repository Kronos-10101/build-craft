# Browser Extensions — Manifest V3 production checklist

Pass/fail checks for Chrome extensions built on Manifest V3: manifest shape, ephemeral service workers, storage, sandboxed execution, offscreen documents, permissions and gestures, side panel wiring, and Chrome Web Store review. Each item is verifiable by reading `manifest.json`, loading the unpacked build, or inspecting the store listing draft.

## Manifest V3 only

- [ ] `manifest_version` is `3` in every build; no Manifest V2 keys, APIs, or examples survive in code, docs, or tests.
- [ ] Background logic lives in `background.service_worker`; `background.scripts` and persistent background pages are absent.
- [ ] Toolbar code uses `chrome.action`; `chrome.browserAction` and `chrome.pageAction` never appear.
- [ ] Programmatic injection uses `chrome.scripting.executeScript`; `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` never appear.
- [ ] API permissions and origin access stay split: `permissions` holds API names, `host_permissions` holds origins, and neither list borrows entries from the other.
- [ ] No inline script, no inline event handler, and no `javascript:` URL in any extension page; every page loads its logic from a bundled file via `src`.
- [ ] Every file named in the manifest exists in the package at the stated path and size: icons at 16, 48, and 128 px are separate files, or the icon fields are omitted entirely.
- [ ] An `action` key exists in the manifest whenever code calls `chrome.action.*`, even if the value is an empty object; without it the namespace is `undefined` at runtime.

## Service worker: ephemeral by design

- [ ] No state lives in module-level variables; a counter, cache, token, or in-flight flag kept in a `let` at the top of the worker is a defect, because the worker can die after roughly 30 seconds idle.
- [ ] Every handler rehydrates before it acts: read the needed keys from `chrome.storage`, compute, then write the result back in the same handler.
- [ ] All listeners register synchronously at the top level of the worker file; registration inside an `async` function, a callback, or a conditional branch means the event is missed after a restart.
- [ ] Timers use `chrome.alarms` with a named alarm and an `onAlarm` listener; `setTimeout` and `setInterval` are not used for work that must survive termination.
- [ ] One-time setup runs in `chrome.runtime.onInstalled`, branching on `details.reason` so install defaults are not reset on every update.
- [ ] Long work moves out of the worker: parsing, media, or DOM work goes to an offscreen document, and the worker keeps only coordination and `chrome.*` calls.
- [ ] Async message handlers keep the channel open correctly: return a Promise, or call `sendResponse` from an async wrapper and return `true`; mixing the two styles in one listener is a failure.
- [ ] Code uses `async`/`await` throughout; promise chains that swallow errors or leave a handler half finished after a restart are rewritten before review.

## Storage: pick the tier on purpose

- [ ] Durable local state uses `chrome.storage.local`; small settings that must follow the user across devices use `chrome.storage.sync` within its 8 KB per item and 100 KB total quotas.
- [ ] State that should survive a worker restart but not a browser restart uses `chrome.storage.session`; nothing session-scoped is treated as permanent.
- [ ] `localStorage` is not used for worker state; it is unavailable in the service worker and invisible to the cross-context `chrome.storage.onChanged` listener.
- [ ] The `storage` permission is declared whenever any `chrome.storage.*` area is read or written.
- [ ] Exclusive-resource state (recording, capture, offscreen creation) is stored as an explicit state value in `chrome.storage.session`, with transitional states that reject a second start while one is in flight.

## Sandboxed execution and CSP

- [ ] Arbitrary or user-supplied code never runs in an extension context: no `eval()`, no `new Function()`, and no string timers in the popup, side panel, options page, or service worker.
- [ ] User code runs only inside a sandboxed page declared under `sandbox.pages` in the manifest, embedded as an iframe in the extension page that hosts it.
- [ ] The host page and the sandbox talk only via `postMessage`; direct access to `iframe.contentDocument` or the framed document throws across the origin boundary and is never attempted.
- [ ] The sandbox page gets no `chrome.*` access by design; any result it produces returns to the host page as message data, and the host performs privileged calls.
- [ ] Blob URL and `srcdoc` iframes are accepted alternatives for a self-contained preview document; they follow the same rule, isolated origin in, messages out, no privileged APIs inside.
- [ ] No remotely hosted code loads at runtime: every script ships inside the package, and fetching data from an API never becomes fetching code to execute.
- [ ] Content scripts are treated as page-adjacent code; heavy DOM batches yield between chunks with `requestAnimationFrame` so the host page main thread stays responsive.

## Offscreen documents

- [ ] An offscreen document exists only for work the worker cannot do: DOM parsing, canvas, Web Audio, `MediaRecorder`, clipboard helpers, or keeping a media stream alive.
- [ ] Creation goes through `chrome.offscreen.createDocument` with a stated `reasons` value and a justification string; the document is created lazily and closed when the job ends.
- [ ] Only one offscreen document exists per profile at a time; creation code checks for an existing document first and reuses or closes it instead of assuming success.
- [ ] Inside the offscreen document, almost no `chrome.*` namespace is assumed present; `chrome.downloads`, `chrome.tabs`, and `chrome.action` are `undefined` there and are never called.
- [ ] The only extension messaging relied on inside the document is the `chrome.runtime` surface, principally `sendMessage`, `onMessage`, and `getURL`, plus ordinary Web APIs.
- [ ] Work splits cleanly across the boundary: the offscreen document does Web API work and posts results back, while the service worker performs downloads, badge updates, and notifications.
- [ ] Lifetime is explicit in code and comments: the document persists until the extension closes it or the profile shuts down, so idle documents are closed rather than left running.

## Permissions, activeTab, and gestures

- [ ] Required permissions stay minimal and scoped: `host_permissions` names specific origins, and `<all_urls>` appears only when the feature genuinely operates on any site.
- [ ] Optional permissions are declared in `optional_permissions` or `optional_host_permissions` and requested at the moment of use, at the feature the user just invoked, never in a bundle at install time.
- [ ] `chrome.permissions.request()` is called from a user gesture; a click or keypress in a popup or side panel counts, and a timer, alarm, or startup path does not.
- [ ] Ordering trap checked by hand: in a service worker `onMessage` listener that forwards a UI gesture, `chrome.permissions.request()` is the first call, with no `await`, storage read, or delay before it, because one async gap spends the gesture and the call throws.
- [ ] Awaiting the result of `chrome.permissions.request()` is fine; awaiting anything before the call is the failure, and the code is shaped so a reader can see that order at a glance.
- [ ] `activeTab` is relied on only inside a direct gesture handler: action click, context menu click, command shortcut, or omnibox acceptance, where it grants temporary access to that tab.
- [ ] A button inside a side panel or a later programmatic step is not an `activeTab` gesture; features that read or script the page from there declare `tabs` plus scoped `host_permissions` and `scripting` instead.
- [ ] Code that reads `tab.url` or `tab.title` declares the `tabs` permission; without it those fields silently return `undefined` with no error to catch.
- [ ] Current grants are checked with `chrome.permissions.contains()` before use, and grants the feature no longer needs are removed with `chrome.permissions.remove()`.

## Side panel, popup, and action

- [ ] Declaring `side_panel.default_path` alone is not a finished panel; the build ships a working open path or it fails review as an unreachable feature.
- [ ] The default open path is set in the worker with `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, using that exact property name; a misspelled variant throws and silently aborts worker setup.
- [ ] The alternative open path is equally explicit: `chrome.action.onClicked` calls `chrome.sidePanel.open()`, which requires that no `default_popup` is set, because the click event does not fire when a popup exists.
- [ ] When a popup and a panel coexist, the popup carries a visible button that calls `chrome.sidePanel.open()`; context menu and command shortcut triggers are acceptable additional paths, not substitutes for a discoverable one.
- [ ] The `sidePanel` permission is declared, panel options are set per tab only where content genuinely differs, and the panel is disabled with `setOptions({ enabled: false })` on tabs it should not appear on.
- [ ] Panel code assumes one instance per window that persists across tab switches; state is read from storage on show rather than held in panel globals across windows.
- [ ] Every context menu action gives visible feedback on completion, via a notification, a badge change, or an in-page toast; a silent save or copy is treated as a broken action.

## Chrome Web Store: publishing gate

- [ ] A single-purpose statement exists as one narrow sentence naming the one job the extension does; a listing that bundles unrelated jobs is split or rewritten before submission.
- [ ] The store description leads with function in plain language, states what the user can do, and contains no implementation detail, no keyword stuffing, and no claim the build does not deliver.
- [ ] Every entry in `permissions` and every pattern in `host_permissions` has its own specific justification written for the reviewer, naming the feature it enables; a generic reason covering several permissions fails.
- [ ] Privacy disclosures match the code exactly: the data use form, the privacy policy text, and actual collection, storage, and transmission behaviour all describe the same practices.
- [ ] A privacy policy URL is live, public, and readable without sign-in whenever the extension collects or transmits user data, and `chrome.storage.sync` use is disclosed as off-device transmission.
- [ ] The package contains no remotely hosted code, no obfuscated code, and no leftover secrets; minification is acceptable, deliberate unreadability is not.
- [ ] Listing assets are present and current: a 128 px store icon, at least one screenshot at 1280 by 800 or 640 by 400 showing the current UI, and a valid monitored contact address.
- [ ] The upload ZIP excludes development material: version control data, `node_modules`, environment files, source maps, tests, and internal store notes stay out of the archive.
- [ ] The manifest version is bumped above the published version, the manifest name and short description match the listing, and the unpacked build passes a full manual pass with no console errors before upload.

## Pre-ship verification

- [ ] Load the exact submission package unpacked in a clean profile and exercise every surface: popup, side panel, options page, and content scripts, with the console open.
- [ ] Kill and restart the worker mid-flow from the extensions page, then repeat the flow; state, badges, and in-flight guards must recover from storage alone.
- [ ] Test on restricted pages and with no network; `chrome://` pages, empty tabs, and failed fetches produce a readable state instead of a blank panel or a crash.
- [ ] Walk every permission prompt as a new user would: optional grants requested in context, denied grants handled without a dead feature, and removed grants respected.
- [ ] Confirm the panel opens from a cold start using only the shipped open path, with no developer steps, no prior popup interaction, and no keyboard shortcut required.
- [ ] Re-read the final manifest against the store draft one last time; permissions, host patterns, icons, and version must match exactly across both documents.

## Sources

- GoogleChrome/modern-web-guidance, `skills/chrome-extensions/` (`SKILL.md` plus `references/extensions/` and `references/webstore/`), Apache-2.0: source for the Manifest V3 rules, service worker lifetime patterns, sandbox and offscreen limits, permission gesture ordering, side panel open paths, and the Web Store review checklist adapted here.
- Chrome Extensions documentation, Manifest V3, `chrome.offscreen`, `chrome.sidePanel`, `chrome.permissions`, and Chrome Web Store program policies, as summarised in the source skill above.
