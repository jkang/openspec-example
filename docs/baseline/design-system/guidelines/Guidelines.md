# ZAPP Design System Guidelines
**Version 1.0 · 2024**

---

## Brand Stance

**Memphis × Zine × Dark Premium**

ZAPP sells digital electronics that are functional, beautiful, and a little weird. The visual language is bold, kinetic, and slightly subversive — zine culture meets premium tech. We do not look like a SaaS dashboard. We do not use gradient hero sections. We use sharp corners, electric color, and assertive type.

---

## Color System

All colors are defined as CSS custom properties in `src/index.css` and mapped to Tailwind utilities via `@theme inline`.

### Core Tokens

| Token | Value | Tailwind Class | Use |
|---|---|---|---|
| `--background` | `#08080E` | `bg-background` | Page ground |
| `--foreground` | `#EFEFFA` | `text-foreground` | Primary text |
| `--card` | `#0F0F1C` | `bg-card` | Surface / panel |
| `--card-foreground` | `#EFEFFA` | `text-card-foreground` | Text on card |
| `--muted` | `#15152A` | `bg-muted` | Subdued surface |
| `--muted-foreground` | `#6E6E9A` | `text-muted-foreground` | Labels, captions |
| `--secondary` | `#1A1A2E` | `bg-secondary` | Secondary surface |
| `--border` | `#222238` | `border-border` | Hairline dividers |

### Brand Accent Tokens

| Token | Value | Tailwind Class | Use |
|---|---|---|---|
| `--primary` | `#C8FF00` | `bg-primary`, `text-primary` | CTAs, prices, active states |
| `--primary-foreground` | `#08080E` | `text-primary-foreground` | Text on primary |
| `--accent` | `#FF2D6B` | `bg-accent`, `text-accent` | Promotions, sale, urgency |
| `--accent-foreground` | `#FFFFFF` | `text-accent-foreground` | Text on accent |
| `--electric` | `#3B6DFF` | `bg-electric` | Trending, info |
| `--warning` | `#FF9A00` | `bg-warning` | Limited, low stock |
| `--success` | `#00E5A0` | `bg-success` | In stock, confirmed |
| `--ring` | `#C8FF00` | `ring-ring` | Focus indicator |

### Usage Rules

- **Primary (Electric Lime)** — primary CTA buttons, price display, active nav state, focus rings, interactive highlights.
- **Accent (Hot Pink)** — sale badges, promotions, wishlist active state, discount indicators.
- **Electric (Blue)** — trending badges, informational highlights, secondary interactive.
- **Warning (Amber)** — limited edition, low stock, time-sensitive.
- **Never** mix primary and accent on the same interactive element.

---

## Typography

Three families. Each with a distinct role. Do not substitute.

### Families

| Family | Role | CSS class | Weights used |
|---|---|---|---|
| **Exo 2** | Display / Headings | `font-display` | 700 Bold, 800 ExtraBold, 900 Black |
| **DM Sans** | Body / UI copy | `font-sans` | 300 Light, 400 Regular, 500 Medium, 700 Bold |
| **JetBrains Mono** | Technical / Prices / Labels | `font-mono` | 400 Regular, 500 Medium, 700 Bold |

### Scale

| Level | Font | Weight | Size |
|---|---|---|---|
| Hero | Exo 2 | Black 900 | `text-6xl` → `text-7xl` |
| H1 | Exo 2 | Bold 700 | `text-5xl` |
| H2 | Exo 2 | Bold 700 | `text-4xl` |
| H3 | Exo 2 | Bold 700 | `text-3xl` |
| Body L | DM Sans | Regular 400 | `text-xl` |
| Body | DM Sans | Regular 400 | `text-base` |
| Body S | DM Sans | Regular 400 | `text-sm` |
| Label | JetBrains Mono | Bold 700 + `uppercase tracking-widest` | `text-xs` |
| Price | JetBrains Mono | Bold 700 | `text-2xl`–`text-4xl` |

### Rules

- All heading text uses `uppercase tracking-tight` by default.
- Prices are **always** `font-mono font-bold text-primary`.
- UI labels (filter names, category tabs, token annotations) are always `font-mono text-xs uppercase tracking-widest text-muted-foreground`.
- No italic in UI. Reserve italic for editorial copy only.

---

## Spacing & Layout

- **Base unit:** 4px (Tailwind default)
- **Page max-width:** `max-w-screen-xl` with `px-6` gutter
- **Card padding:** `p-6` or `p-8` depending on content density
- **Section spacing:** `space-y-32` between major page sections
- **Grid:** 12-column base. Product grid: `grid-cols-2 md:grid-cols-4`

### Border Radius

```css
--radius: 2px;
```

Use `rounded-none` or `rounded-sm` (2px) throughout. Sharp corners are brand. Reserve `rounded-full` strictly for avatar chips or pill-shaped quantity indicators.

---

## Components

### Button

Five variants: `primary` · `accent` · `outline` · `ghost` · `muted`
Four sizes: `sm` · `md` · `lg` · `xl`
Always `font-display font-bold uppercase tracking-wide`. Zero border-radius.

```tsx
<Btn variant="primary" size="lg" icon="⚡">立即购买</Btn>
<Btn variant="accent">限时抢购</Btn>
<Btn variant="outline">查看详情</Btn>
```

### Badge

Seven variants for product status: `primary` · `accent` · `electric` · `warning` · `success` · `muted` · `outline`

```tsx
<Badge variant="primary">NEW</Badge>
<Badge variant="accent">SALE</Badge>
<Badge variant="warning">LIMITED</Badge>
```

### Product Card

- `bg-card border border-border` default
- `hover:border-primary` on hover
- Image with scale-on-hover (`group-hover:scale-105`)
- Wishlist button appears on hover (opacity-0 → opacity-100)
- Add-to-cart button flips to success state after click

### Navigation

- Logo: compact square `bg-primary` with brand initial
- Categories: `font-mono text-xs uppercase tracking-wider`; active state uses `bg-primary text-primary-foreground`
- Cart badge: `bg-primary text-primary-foreground` small square counter

### Price Display

| Context | Style |
|---|---|
| Regular | `font-mono font-bold text-primary text-3xl`+ |
| Sale | Strike-through original in `text-muted-foreground`, sale price in `text-primary`, discount in `<Badge variant="accent">` |
| Pre-order | Price in `text-foreground` + `<Badge variant="outline">预售</Badge>` |
| Member | Price in `text-primary` + `<Badge variant="primary">会员专享</Badge>` |

---

## Imagery

Photos from Unsplash. Format: `https://images.unsplash.com/photo-{id}?w={w}&h={h}&fit=crop&auto=format`

- Product images: 400×400 or 400×300
- Hero banners: 1200×400 with `opacity-20` overlay tint
- Always set `bg-muted` on image containers as placeholder

---

## Iconography

System uses Unicode symbols for lightweight inline icons. No icon library dependency.

| Symbol | Use |
|---|---|
| `⚡` | Primary CTA / Fast |
| `♡` / `♥` | Wishlist |
| `⊕` | Add to cart |
| `⌕` | Search |
| `↗` | External link / CTA |
| `★` | Rating star |
| `✓` | Confirmed state |
| `×` | Remove / close |

---

## Voice & Microcopy

- **Bold and direct.** "立即抢购" not "查看更多". "加入购物车" not "放入购物车".
- **Playful but precise.** Product names can be poetic. Price and shipping info must be exact.
- **Mono labels are shouted.** All caps, tracked out. `NEW ARRIVAL · LIMITED EDITION`.
- **No lorem ipsum.** All placeholder copy must be realistic.

---

## Do / Don't

| ✓ Do | ✗ Don't |
|---|---|
| Sharp corners (`rounded-none`) | Rounded cards (>4px) |
| Electric Lime for primary CTAs | Blue for primary CTAs |
| Dark ground (#08080E) | Light background |
| `font-display font-black uppercase` for headings | Sentence case headings |
| `font-mono` for all prices | `font-sans` for prices |
| Sparse, intentional color use | Multi-color gradient headers |
| Hover: `border-primary` highlight | Hover: background color flood |
