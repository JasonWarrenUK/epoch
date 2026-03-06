# Epoch — Aesthetics & UX Plan

## Vision
Transform Epoch from a dark-gold chronicle into an **elegant, cinematic, light-warm** experience — like opening a beautifully typeset history book in a sunlit reading room.

---

## 1. Theme Overhaul: Light & Warm Palette

**Replace** the current dark "grand-chronicle" theme with a new "epoch" theme.

| Role | Current | New |
|------|---------|-----|
| Background (base-100) | `#0f0f0f` dark | `#FAF6F0` warm ivory |
| Surface (base-200) | `#1a1a2e` dark navy | `#F0EAE0` warm linen |
| Depth (base-300) | `#16213e` dark blue | `#E6DFD3` parchment |
| Text (base-content) | `#e8e8e8` light gray | `#2C2C2C` deep charcoal |
| Primary | `#e2b553` bright gold | `#8B4513` warm saddlebrown |
| Secondary | `#b8922e` muted gold | `#6B7B3A` muted olive |
| Neutral | `#3a3a5c` purple-gray | `#C4B8A8` warm taupe |
| Neutral content | `#b3b3b3` gray | `#7A7268` warm gray |
| Accent (new) | — | `#B8860B` dark goldenrod |

**Typography pairing:**
- Headings: **Playfair Display** (serif) — cinematic, high-contrast
- Body: **Source Sans 3** (sans-serif) — clean, readable, warm
- Load via Google Fonts

---

## 2. Layout & Spacing: Spacious & Cinematic

### Header
- Simplify to just the wordmark "Epoch" in large Playfair Display
- Remove heavy border; use a subtle warm shadow or thin hairline instead
- More vertical breathing room

### Main Content
- Increase max-width from 52rem to **60rem** for the timeline
- Keep form narrower (~40rem) and center it
- Increase vertical padding throughout
- Add generous spacing between sections

### Footer
- Minimal: just the tagline in small italic serif
- Softer separator (thin warm line or none)

### Page Flow
- Form sits alone on initial view, centered with spacious padding
- After submission, form collapses/minimizes and timeline takes over as the main content

---

## 3. Timeline: Collapsible Decades & Years

This is the core UX change — a **two-level collapsible vertical timeline**.

### Structure
```
── 1820s ──────────────────────── ▾
   ── 1823 ────────────────────── ▾
      • Event description here
      • Another event this year
   ── 1827 ────────────────────── ▾
      • Event description here

── 1830s ──────────────────────── ▸ (collapsed)

── 1840s ──────────────────────── ▸ (collapsed)
```

### Behavior
- **Decades** are collapsed by default, showing just the decade label and event count
- Clicking a decade expands it to show its **years**
- **Years** within an expanded decade are also collapsed by default, showing year + event count
- Clicking a year expands it to show the individual **event cards**
- Smooth expand/collapse animations (slide + fade)
- A subtle vertical connecting line runs through the timeline
- The decade/year of the character's birth and death get special visual markers

### Visual Design
- Decade headers: large serif text, warm brown, with a horizontal rule extending to the right
- Year headers: medium serif text, slightly indented
- Event cards: clean white cards with subtle warm shadow, no heavy borders
- Connecting line: thin, warm taupe, dashed or dotted
- Expand/collapse chevrons: subtle, animated rotation

---

## 4. Character Form: Refined & Inviting

- White card on ivory background with subtle shadow (no hard border)
- Inputs: clean underline style or very subtle bordered with warm tones
- Labels in small caps or slightly spaced sans-serif
- Submit button: warm saddlebrown with cream text, serif lettering
- Loading state: elegant ellipsis animation or a turning hourglass icon

---

## 5. Event Cards: Clean & Readable

- White/cream background cards with subtle warm box-shadow
- Year displayed as a large serif numeral in the margin or top-left
- Age badge: small, warm-toned pill
- Event text in Source Sans 3, comfortable line-height
- "Read more" links in olive/secondary, understated

---

## 6. Polish & Micro-interactions

- **Collapse/expand**: smooth slide transitions (200-300ms ease)
- **Page load**: subtle fade-in for main content
- **Timeline entry**: staggered fade-in as decades appear after form submission
- **Hover states**: gentle color shifts on interactive elements
- **Focus styles**: warm-toned focus rings for accessibility

---

## Implementation Order

1. **Theme & fonts** — New color palette, font imports, base theme in `app.css`
2. **Layout** — Header, footer, main content spacing in `+layout.svelte`
3. **Form redesign** — `CharacterForm.svelte` visual refresh
4. **Timeline restructure** — Group events by decade/year, build collapsible structure in `Timeline.svelte`
5. **Event cards** — `EventCard.svelte` visual refresh
6. **Animations** — Add transitions for collapse/expand, page transitions
7. **Rename** — Update all "Grand Chronicle" references to "Epoch"
