# Motion Craft — deciding, timing, and verifying interface animation

Scope: how interface movement gets chosen, paced, and proven before it
ships — whether a change should animate at all, where the motion sends the
eye, how long each kind of move runs, and how the result holds up under
interruption, slow networks, and reduced-motion settings. Durations,
easing curves, springs, and named motion tokens live in `design-polish.md`;
this chapter covers the decisions those values are picked to serve, and
the checks that confirm the decisions worked. Checked 2026-11-13.

## Contents

- The decision procedure — five questions, in order
- The frequency gate — how often decides whether it moves
- Timing — exits run shorter and quieter
- Origin and pairing — growth starts at the trigger
- Directing the eye — one lead at a time
- Meaning — movement that explains itself
- Physical techniques — weight, arcs, and depth
- Interruption, replacement, and dragging
- Async feedback and optimistic state
- Verification — prove the motion, not the intention
- Sources

## The decision procedure — five questions, in order

- [ ] Put every animated interaction through five questions in a fixed order: (1) should this move at all, (2) where should the eye go, (3) how should it move, (4) can people hit it and choose it, (5)
  can they finish.
- [ ] Treat the order as binding: a strong answer further down never compensates for a failure higher up — a flawless curve on a motion that fails question 1 is still a motion to delete.
- [ ] Answer question 1 by naming what the motion tells the user (where something came from, that an action registered, what changed, what caused it); motion that answers none of these is cut, not
  polished.
- [ ] Record the frequency and the answer for each interaction before tuning any numbers — the frequency gate below decides most of question 1 and 3 mechanically.
- [ ] Choreography of three or more stages gets a written storyboard before code: a comment naming when each stage starts after the trigger, one timing entry per stage, and one config object per
  element, so the sequence can be tuned in a single place.
- [ ] Build with the animation stack the project already has, and add nothing for motion's sake: plain state changes stay in CSS transitions, a spring library already installed is used rather than
  hand-rolled, and no library is introduced for what a transition already does — two engines animating the same class of change will drift out of sync with each other.
- [ ] Questions 4 and 5 have their own craft chapters (targets, grouping, and choice architecture in `design-polish.md`; form and completion mechanics in `web-frontend.md`) — this chapter's
  contribution to them is the frequency gate and the async rules below.

## The frequency gate — how often decides whether it moves

- [ ] Triggered many times per session, or driven from the keyboard (shortcuts, arrow keys, tab focus, command palettes): no transition at all — the new state renders on the next frame, because a
  gliding highlight falls behind keystrokes.
- [ ] Triggered a few times per session (opening a menu, a modal, a drawer, saving a form): animate, inside the timing caps in the next section.
- [ ] Rare, once-a-session milestones (onboarding, a first success, completing a large task): choreography is permitted — up to 500ms per individual move and roughly 2.5s for the whole sequence.
- [ ] Press and hover feedback is exempt from the gate at every frequency: it keeps a short 100–150ms response, because the feedback is the answer to the input, not decoration on top of it.
- [ ] When hover and keyboard highlight share a style, attach the transition to the hover rule only, so keyboard-driven highlight changes stay instant.
- [ ] Nothing already at rest when the page first paints plays an entrance; entrances belong to changes the user causes after load, not to the initial render.
- [ ] The gate is a product-UI rule: marketing pages are the exception and may run slower and more theatrical on purpose, but anything people operate repeatedly stays inside the caps regardless of how it is styled.
- [ ] Wide press targets behave differently: a surface broader than about 200px (a card, a row) answers a press with a background change instead of a scale, because a percentage scale on a wide
  surface reads as a jump; dense toolbars and editor chrome may opt out of press scaling entirely.

## Timing — exits run shorter and quieter

- [ ] Pick durations and curves from the tokens in `design-polish.md`; this section governs how entrance and exit values relate, not the values themselves.
- [ ] Exits run 20–30% shorter than their matching entrance — a departing element gets less time because the viewer's focus has already moved past it.
- [ ] Exits are also quieter: a fade with a small nudge (roughly 8–16px toward where the element is headed, or a settle back toward the scale it entered from), never the full travel distance of the
  entrance.
- [ ] Exception: when the destination is the meaning of the gesture (a drawer closing to its edge, a card swiped away), the element leaves along the path it arrived on, at full travel.
- [ ] Never remove an element with an instant `display: none` — the eye loses track of where it went; always give the exit a visible, shortened path.
- [ ] An element kept mounted so it can animate out is inert while closed (`pointer-events: none`, the `inert` attribute): it must not catch clicks, hover, or focus in its hidden state.
- [ ] When a motion feels sluggish, shorten the duration first; reach for the curve only after the duration is right — duration is what slowness is made of.
- [ ] Hard ceiling: menus, popovers, modals, drawers, and toasts never exceed 300ms in either direction; within any range, larger elements and longer travel distances take the longer end.
- [ ] Component bands inside that ceiling: tooltips around 125ms; dropdowns and popovers 150–250ms; modals, drawers, sheets, and toasts 200–300ms.
- [ ] Moves that happen in place (a progress fill advancing, rows closing a gap, an expander opening) run 200–300ms; spatial moves (a page transition, a shared-element flight, a flip) are the only
  ones allowed 300–400ms.
- [ ] A modal is the worked example of the bands: roughly 220ms in and 160ms out on a 0.97 → 1 scale with a fade — it interrupts the user, so it arrives quietly, never sliding in from off screen and
  never bouncing.
- [ ] A toast enters by rising a short distance (about 16px) from the screen edge it lives on, and a toast carrying an action (Undo, Retry) stays visible for at least 5 seconds.
- [ ] One layout animation is permitted: an expander animating `grid-template-rows` between `0fr` and `1fr`, which resizes the real content height without measuring it — every other size change goes
  through transforms (see Verification).

## Origin and pairing — growth starts at the trigger

- [ ] Popovers, dropdowns, and tooltips scale from their trigger (transform-origin set to the trigger's position or side), never from their own center.
- [ ] A scaling entrance starts at 0.95 (0.97 for small elements) with opacity at 0 — never from scale 0; an element that scales up from nothing reads as a pop, not a growth.
- [ ] Paired elements that form one object (modal and its overlay, drawer and its backdrop, tooltip and its arrow) share a single duration and a single curve; mismatched timing between the two halves reads as a defect, so
  they are set together.

## Directing the eye — one lead at a time

- [ ] Only one element per view breaks the pattern around it (normally the primary action), and motion is the strongest pattern-breaker there is, so whatever moves is what gets noticed; spend
  movement there and nowhere else by default.
- [ ] Only one primary motion runs at a time: the element the user touched, or the one answering them; everything else holds still or recedes (siblings dimmed, a scrim behind an expanded element).
- [ ] A secondary action also has timing bounds: it starts with the primary or within about 100ms of it, and finishes within about 150ms after it — a secondary that outlasts its primary has become a
  second lead.
- [ ] When one action sets off several motions, chain them in sequence (each starts as the previous one lands) rather than running them side by side and splitting attention.
- [ ] Stagger only content that arrives on its own: repeated items (rows, cards, menu entries) enter 30–50ms apart, and only the first 6 — the remainder come in together with the sixth.
- [ ] Distinct pieces of one section (heading, then body copy, then actions) stagger wider, 80–100ms apart; never slide a whole section in as a single block.
- [ ] Content inside a container that is itself moving (a drawer's rows, a modal's body) arrives with the container, in one piece, with no stagger of its own.
- [ ] A secondary action rides on a primary one, never stands alone: it starts with the primary or just after it, ends close behind it, and travels at most a third of the primary's movement.
- [ ] Reserve exaggeration for moments that must register — a submit error, a failed attempt, a first success; on routine transitions it spends the attention it is meant to direct.
- [ ] Error shake, exactly: the field moves through translateX 0, −10, 10, −6, 6, −3, 0px over 360ms; focus moves to the field and the message sits beside it — and the shake never fires on blur, only
  on a failed submit or attempt.

## Meaning — movement that explains itself

- [ ] A changing number rolls only the digits that actually change, upward when the value grows and downward when it shrinks, in tabular figures so neighboring digits never shift sideways.
- [ ] An element leaves toward where it went: a deleted row collapses, an archived item slides toward the archive side, a sent message rises — the exit direction states the outcome.
- [ ] Anything drawn as a physical object (a card, a letter, a ticket) moves like one: it does not fade in or out while in view, never passes through another object, and clears its container's edges
  before moving toward the viewer.
- [ ] Finished things recede: a completed task collapses, dims, or stacks away, so the work that remains is what stands out.
- [ ] A gesture hint demonstrates instead of describing: a small looping hand that swipes or drags, which disappears the moment the user hovers over or touches the element it teaches.

## Physical techniques — weight, arcs, and depth

- [ ] Arcs: when a move's start and end differ by more than 40px on both axes, curve the path so it bulges 10–20% of the travel distance off the straight line; single-axis moves (drawers, reorders)
  stay straight.
- [ ] For depth on an arc, scale the element up to at most 1.3 at the top of the path and deepen its shadow as it rises, so it reads as lifting off the surface instead of sliding across it.
- [ ] Define motion as poses: the named states (closed/open, idle/pressed/done) or keyframes at explicit offsets, and let the engine interpolate; frame-by-frame code is only for motion driven live
  by input, such as drags and scroll-linked effects.
- [ ] Follow-through: when a container stops, its non-text contents settle a beat later; drive them with a softer spring (damping ratio 0.7–0.85) or a 20–40ms delay, while text never lags, wobbles,
  or arrives separately.
- [ ] Follow-through belongs to occasional and rare motion only: high-frequency interactions get none, and overshoot stays under roughly 4% of the travel distance.
- [ ] Squash and stretch: at most 15% deformation, volume held constant (scaleX × scaleY ≈ 1), applied only to objects that behave physically (things that bounce, land, get dropped or caught), and
  never to inputs, layout containers, or anything being read while it moves.
- [ ] Flips and turns get real depth: a container perspective of 600–1000px, `transform-style: preserve-3d` on the turning element, and `backface-visibility: hidden` on its faces; never imitate a flip
  by squeezing with scaleX.
- [ ] A wind-up (anticipation) belongs only to the rare branch: before a launch or flip the user deliberately sets off, pull back 5–10% of the travel (or dip to 0.95 scale) over 80–120ms, then go;
  before anything frequent, that wind-up is pure added latency.
- [ ] Cross-fades between images run inside an isolated group with additive blending (`mix-blend-mode: plus-lighter`), or the midpoint washes out as the background shows through both half-transparent
  layers; a group fades through its wrapper, never child by child.
- [ ] Fade content out with a mask (`mask-image`), never with an overlay painted in the background color — the painted overlay breaks on any other background, dark mode included.

## Interruption, replacement, and dragging

- [ ] Input is never blocked while an animation runs; the interface accepts the next action at any point in any motion.
- [ ] Anything the user can toggle or redirect mid-motion uses a transition or a spring, so reversing it starts from the position currently on screen; keyframes are reserved for one-shot sequences
  nothing can interrupt.
- [ ] When one element replaces another in the same spot (a label becomes a spinner, one card succeeds another), animate both at once, stacked in the same space — never wait for the old one to finish
  leaving before the new one enters.
- [ ] State icons swap through a deep scale (0.3 → 1) with opacity and a few px of blur on a bounce-free spring; a timid scale range (0.8–0.9) reads as a rendering glitch instead of a deliberate swap, and a plain
  visibility toggle reads as a cut.
- [ ] Clicks on continuous controls assist the user: a slider click lands on the nearest round step and springs there, rather than jumping raw to the clicked position.
- [ ] When an item exits a list, its siblings close the gap with transforms while it leaves — the exiting element is taken out of the layout flow at once, so the group never waits for the exit to
  finish before reflowing.
- [ ] An element that is traveling or changing shape stays the same element for the entire move; never swap it for a stand-in mid-flight.
- [ ] Drags track the pointer 1:1 with no easing while held; on release, a spring takes over and carries the release velocity into the settle.
- [ ] At a drag bound, resistance grows with diminishing returns (rubber-banding) after a small dead zone, instead of a hard stop; on release the element springs back to the bound.

## Async feedback and optimistic state

- [ ] The interface answers every input within 400ms (the Doherty threshold); the pressed state in particular renders on the same frame as the input, never after a network round trip.
- [ ] Apply optimistic updates to actions that almost never fail (liking, toggling, reordering, marking read, removing an item): the change appears immediately, and a server refusal rolls it back with
  a message explaining what happened.
- [ ] Show a spinner only once a wait passes 300ms, and once shown keep it visible for at least 500ms — fast responses never flash one, and slow ones never flicker.
- [ ] Past 1s of waiting, show a skeleton placeholder sized to the content that will replace it, placed where that content will land.
- [ ] Reads render the last-seen cached state first and reconcile when fresh data arrives; never render a default value that visibly flips (an empty bookmark icon snapping to filled) when the fetch
  lands.
- [ ] Final submits (paying, placing an order, confirming anything irreversible) disable their trigger the moment they fire, so a second click cannot submit twice.
- [ ] In a multi-step flow, a step that passes validation locally saves in the background while the user moves on; a failed background save surfaces a retry that preserves their place — except a step
  whose result the next step depends on, which waits like a final submit.
- [ ] Work that takes seconds and cannot be skipped runs in the background or behind content worth reading — never behind a bare spinner with nothing else on screen.

## Verification — prove the motion, not the intention

- [ ] Scrub every animation at 10% speed: the first frame responds, the last frame settles with no pop, and only one element leads at any moment.
- [ ] Interrupt each animation halfway through; it must turn around from the position it had reached, not jump to an endpoint and replay.
- [ ] Hammer the keyboard through every list, menu, and shortcut path; no highlight, focus ring, or panel may trail behind the keystrokes.
- [ ] Tap the edges of every small target on a touch device, and confirm no hover motion fires on tap — hover animation belongs behind a real pointer only.
- [ ] Throttle the network to waits of 1s or more: presses still register instantly, no spinner appears under 300ms, and pending state shows where the result will land.
- [ ] Force each async failure once (offline, a server error, a refused optimistic update): the user keeps everything they entered, the optimistic change rolls back with its message, and a retry path
  exists from the failure state.
- [ ] With reduced motion on, every animation is off (work indicators like a spinner or progress bar excepted, since a frozen spinner is indistinguishable from a crashed app), and every end state and every piece of information is
  identical to the motion-on version.
- [ ] Audit the animated properties: only `transform` and `opacity` move; width, height, top, left, and margin are never animated — a collapsing element is handled with a FLIP technique (measure, then
  animate the transform).
- [ ] Switch the theme and confirm no color transitions fire anywhere on the page (suppression technique: `design-polish.md`).
- [ ] Run the tenth-use test last: replay each animation as someone seeing it for the tenth time today, and cut or shorten whatever has started to feel slow.

## Sources

- charles-ux-animation, in LemonFace0309/charles-skills (github.com/LemonFace0309/charles-skills/tree/main/skills/charles-ux-animation) — the synthesis this chapter's decision procedure, frequency gate, and verification pass are drawn from; that repo carries no license file, so every sentence here is original wording and only its ideas and values are carried over.
- Frank Thomas & Ollie Johnston, *The Illusion of Life* — Disney's twelve principles of animation (staging, follow-through, squash and stretch, arcs), the root of the physical techniques above.
- Jon Yablonski, *Laws of UX* (lawsofux.com) — the Doherty threshold and the response-time limits behind the async section.
- Emil Kowalski's writing on interface animation — the discipline of frequency-based restraint, origin-anchored popovers, and exits shorter than entrances.
