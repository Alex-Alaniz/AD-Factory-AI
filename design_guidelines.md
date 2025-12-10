# Bearified Ad Factory - Design Guidelines

## Design Approach

**Selected System**: Linear-inspired productivity aesthetic combined with modern admin dashboard patterns. This approach prioritizes clarity, efficiency, and sophisticated minimalism for internal tooling.

**Core Principles**:
- Information clarity over visual decoration
- Generous whitespace for reduced cognitive load
- Consistent component hierarchy
- Scan-friendly layouts optimized for repeated use

---

## Typography

**Font Stack**: Inter (via Google Fonts CDN)
- Primary: Inter 400 (body text, form inputs)
- Medium: Inter 500 (labels, secondary headings)
- Semibold: Inter 600 (primary headings, buttons)

**Type Scale**:
- Page titles: text-2xl (24px)
- Section headings: text-lg (18px)
- Body/Forms: text-base (16px)
- Labels/Meta: text-sm (14px)
- Timestamps/Count: text-xs (12px)

**Line Heights**: Use relaxed spacing (leading-relaxed for body, leading-tight for headings)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24**
- Micro spacing: 2-4 (gaps between related elements)
- Component padding: 6-8 (card interiors, form fields)
- Section spacing: 12-16 (between major sections)
- Page margins: 20-24 (outer containers)

**Grid Structure**:
- Container: max-w-7xl with mx-auto px-8
- Two-column layouts for settings: 1/3 sidebar + 2/3 content
- Script cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 with gap-6

---

## Component Library

### Navigation
- Fixed top bar (h-16) with logo left, admin email/settings icon right
- Sidebar navigation (w-64) for Dashboard/Scripts/Settings/Tracking pages
- Navigation items: pl-6 pr-4 py-3 with icon + label

### Forms
- Input fields: h-10 px-4 with rounded-lg borders
- Textareas: min-h-[120px] p-4 rounded-lg
- Labels: mb-2 text-sm font-medium
- Submit buttons: h-10 px-6 rounded-lg font-semibold

### Script Cards
- Container: rounded-xl border with p-6
- Header: flex justify-between items-start mb-4
- Script type badge: px-3 py-1 rounded-full text-xs font-medium
- Hook text: text-lg font-semibold mb-3
- Body text: text-sm leading-relaxed mb-4
- CTA text: text-sm font-medium mb-4
- Footer: flex justify-between items-center with metadata (duration, chars) and copy button
- Copy button: h-8 px-4 rounded-lg text-sm

### Tracking Table
- Full-width table with rounded-lg border
- Header: sticky top-0 with font-medium text-sm
- Row height: h-14 px-6
- Status badges: inline-flex px-2.5 py-0.5 rounded-full text-xs
- Columns: Date | Hook Preview | Type | Platform | Status | Actions
- Action icons: h-8 w-8 clickable areas

### Dashboard Stats
- Stats grid: grid-cols-1 md:grid-cols-3 gap-6 mb-12
- Stat card: rounded-xl border p-6
- Number: text-3xl font-semibold mb-1
- Label: text-sm opacity-60

### Settings Page
- Two-column: sticky sidebar with navigation tabs, main content area
- Section headers: text-lg font-semibold mb-6
- Form sections: space-y-6 with dividers between

---

## Interactions

**Buttons**: Three variants
- Primary: h-10 px-6 rounded-lg font-semibold
- Secondary: h-10 px-6 rounded-lg border font-medium
- Icon-only: h-8 w-8 rounded-lg flex items-center justify-center

**Focus States**: 2px offset ring for keyboard navigation

**Animations**: Minimal - only subtle hover transitions (transition-colors duration-150)

---

## Icons

**Library**: Heroicons via CDN (outline for navigation, solid for actions)
- Navigation: 20px (w-5 h-5)
- Action buttons: 16px (w-4 h-4)
- Status indicators: 12px (w-3 h-3)

---

## Key Layouts

**Dashboard Page**:
- Stats grid at top (3 cards)
- "Generate New Scripts" prominent button (h-12 px-8)
- Recent scripts grid below (3 columns on desktop)

**Scripts Library**:
- Filter bar: flex items-center gap-4 mb-6 (platform tabs, search input, date filter)
- Scripts grid: 3 columns responsive
- Load more button at bottom

**Settings Page**:
- Left sidebar (w-56): section navigation
- Right content (flex-1): form sections with max-w-2xl

**Tracking Dashboard**:
- Export CSV button top-right
- Filter/search bar below
- Full-width table
- Pagination controls at bottom

---

## Images

No hero images required. This is a utility dashboard focused on functionality over visual marketing. Icons and UI elements provide all necessary visual hierarchy.