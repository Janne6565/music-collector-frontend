# Design prompt — turn 13: motion and polish

Paste into Claude Design, project `a1b6280a-eae4-4ab0-aab3-68ea4a303c9b`
(`Music Collector.dc.html`). Written 2026-08-25, after turn 12.

---

This is **turn 13 of Music Collector: motion and polish**. Nothing in it should move a
box. Every screen through turn 12 is built and shipped and I am happy with the layouts —
what I want from this turn is how the app *arrives*: transitions, entrances, exits, and
the small pieces of state change that currently just snap.

Keep every token, type scale and component from the existing deck. Add a **motion
section** to the deck the way turn 9 added the loading shimmer: a named, reusable set
(durations, easings, named transitions) plus annotated frames showing each one applied.

## What the app is

A local-first record-collection tracker — vinyl, CD, cassette, digital. Two clients that
must read as one product: a web app (sidebar shell, screen 1f) and an Expo mobile app
(tabs). Warm paper palette, Newsreader for titles, Manrope for UI, a mono for counts.
On mobile, the item detail screen recolours to the dominant colour of the sleeve, light or
dark. Web dropped that in turn 12 — beside a fixed sidebar it read as the app flickering
between two themes — and stays in the paper palette throughout.

## The real constraint: almost nothing waits any more

This matters more than anything else for choosing motion. The data lives on the device.
Opening a record, filtering, sorting, editing, deleting are all local reads — sub-frame.
There is no spinner to design around, and motion that pretends there is a wait would be
inventing one.

The only genuine waits left are:

- **Release search** (add flow), 0.4–4 s. Upstream is Discogs first, MusicBrainz as
  fallback, debounced at 350 ms.
- **Artist search, artist portrait, discography**, similar.
- **Sync**, when the user has an account. Most users have none.
- **The cover theme.** New and important — see below.

## The one piece of async that is visible on a finished screen — mobile only

A release added from search arrives with no colour theme; the palette is only sampled on
the server's detail lookup. That used to be fetched in front of the detail screen, which
is why opening a record took seconds. It now happens *beside* the screen: the record opens
instantly in neutral paper chrome, and the sleeve's colour lands 0.1–4 s later — sometimes
recolouring the whole screen from paper to near-black.

**Please design that recolour explicitly, for mobile.** It is the one moment in the app
where a screen changes under the reader without being touched. I need to know how long it
takes, what eases, whether text and the accent colour cross-fade with the background or lag
it, and what it does when the answer is "no theme" and nothing should change at all. A hard
cut is jarring; a slow wash on a dark cover may be worse.

(It is usually pre-warmed now — adding a record fetches the palette in the background — so
the common case is that the record is already themed on open. Design the uncommon case.
Web is unaffected: it kept the paper palette in turn 12 and never recolours.)

## Surfaces that currently snap, and want a designed transition

**Web**

1. **Library (1f) → item detail (12a) and back.** A full route swap today. The cover the
   user clicked exists on both screens at different sizes — worth deciding whether that is
   a shared element or whether the honest thing is a cross-fade.
2. **Add sheet (6a) and the copy dialog (8d/12b).** Native `<dialog>` over a dimmed
   library. Appears and disappears instantly, with no backdrop fade and no exit at all.
   Both enter and exit, please, plus what Escape/backdrop-dismiss looks like. Since turn 12
   this is also how editing works, so it is the busiest surface in the app.
3. **The library grid on change.** Filter chips, the format rail, the sort menu and a
   debounced search all reorder and re-length the same grid. Today items teleport. Also:
   the entrance when the grid first paints, and what a *newly added* record does when the
   user returns from the add sheet — it should be findable without hunting.
4. **Cover art loading.** `ReleaseArt` already holds the frame with a shimmering
   placeholder (turn 9). Missing: what happens at the moment the real cover lands. About
   **4 in 10 releases have no cover at all**, in which case the tile falls back to the
   user's own first photo of that copy, or a typographic placeholder — so "cover appears"
   is a minority event, not the default.
5. **Deleting a copy.** It lives in the copy dialog's footer since turn 12: the dialog
   closes, the route returns to the library, and the grid reflows — three uncoordinated
   things at once.
6. **Empty and first-run states.** A collection of zero records, an empty wishlist, a
   search with no results.

**Mobile (Expo)**

7. **Tab changes**, and **push to a record** and back.
8. **The add flow (10a) and the artist screen (10c)** — search results replacing under a
   debounced field, and a pressing being added from a discography.
9. **The photo strip** — a sleeve photo added from the camera or library.

## What I need out of the turn

- A named motion set: two or three durations, two or three easings, named and used
  consistently, in the same spirit as the existing colour and type tokens. I would rather
  have four transitions used everywhere than fifteen bespoke ones.
- Enter **and** exit for anything that appears over something else.
- **A reduced-motion variant for each.** The deck already honours
  `prefers-reduced-motion` for the shimmer and the pulse, and I want that to stay true
  across the whole set rather than be a switch that turns the app static.
- **An explicit list of what should not animate.** Local reads are instant and I do not
  want motion inserted to make them feel considered.
- Annotated timings on the frames — I am implementing this by hand.

## Implementation constraints, so nothing is designed that cannot be built

- Web is React 19, Tailwind v4, TanStack Router. There is no animation library in the
  project today and I would rather stay on CSS transitions, `@keyframes`, view
  transitions and `@starting-style` than take one on — say so if something genuinely
  needs a library.
- Mobile is React Native / Expo with no Reanimated installed, so it has RN's built-in
  Animated unless the design justifies adding one. Where a web transition cannot be
  mirrored on mobile, please say what mobile does instead rather than leaving it implied.
- Both clients share the same tokens by hand-mirrored files, so anything token-shaped
  needs to be expressible as plain values.
