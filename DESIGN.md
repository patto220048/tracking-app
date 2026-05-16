# Design System: Linear Aesthetic (Video Tracking App)

## 1. Philosophy
The design language is inspired by Linear.app: **Ultra-minimal, precise, and utilitarian**.
It focuses on high performance, getting out of the user's way, and presenting information with absolute clarity. We are building a professional Video Tracking / NLE (Non-linear Editor) application, so dark mode is the default and only mode.

## 2. Typography
- **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, sans-serif.
- **Weights:**
  - Regular (400) for body text.
  - Medium (500) for buttons and secondary headings.
  - Semi-bold (600) for primary headings.
- **Tracking (Letter Spacing):** Slightly tight for headings (`-0.01em` to `-0.02em`), normal for body text.

## 3. Color Palette (Dark Mode Only)
- **Backgrounds:**
  - App Background: `#0A0A0A` (Deepest black-gray)
  - Panel/Sidebar Background: `#141414`
  - Elevated/Surface Background (Modals, Cards): `#1A1A1A`
- **Borders & Dividers:**
  - Subtle borders: `#282828`
  - Hover borders: `#3A3A3A`
- **Text & Icons:**
  - Primary text: `#EEEEEE` (High contrast, but not pure white)
  - Secondary text: `#888888` (For muted info, timestamps)
  - Disabled text: `#444444`
- **Accents:**
  - Primary Brand (Linear Purple): `#5E6AD2`
  - Hover Primary: `#6E7AE2`
  - Success (Tracking OK): `#4CAF50`
  - Error (Lost Target): `#F44336`

## 4. Spacing & Sizing
- Use a rigid **4px/8px grid system**.
- Padding for buttons: `4px 12px` (small), `8px 16px` (medium).
- Gap between flex items: `8px` or `12px`.
- Border Radius (Rounding):
  - Buttons, Inputs, small components: `6px`
  - Modals, Video Player container: `12px`
  - Floating panels: `8px`

## 5. Shadows & Elevation
Instead of heavy drop shadows, use **subtle borders + very soft inner/outer glows** for elevation.
- **Level 1 (Panels):** `border: 1px solid #282828`
- **Level 2 (Dropdowns, Command Palette):** `border: 1px solid #3A3A3A`, `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4)`
- **Interactive Focus:** `box-shadow: 0 0 0 2px rgba(94, 106, 210, 0.3)`

## 6. Components
### Buttons
- **Primary:** Background `#EEEEEE`, Text `#0A0A0A`, no border. Hover: Dim opacity to 90%.
- **Secondary:** Background `#1A1A1A`, Text `#EEEEEE`, Border `1px solid #282828`. Hover: Background `#222222`, Border `#3A3A3A`.
- **Icon Buttons:** No background until hovered. Hover: Background `#222222`.

### Inputs / Timeline / Curve Editor
- Background: `#0A0A0A`
- Border: `1px solid #282828`
- Text: `#EEEEEE`
- Focus state: Border `#5E6AD2`, with the focus shadow mentioned above.
- **Timeline Tracks:** Subtle alternating backgrounds (`#0A0A0A` and `#111111`) with a bright red or bright blue playhead (`1px` width).

## 7. Animations & Interactions
- **Speed:** Snappy and responsive. Use `150ms` or `200ms` for transitions.
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` (Swift out).
- **Hover/Active:**
  - Active (click) states should scale down slightly: `transform: scale(0.98);`
  - Opacity transitions for hovers.

## 8. AI Coding Instructions (For Future Agents)
When modifying the UI or creating new components in React/Vite/Tauri:
1. **Always read this file first.**
2. Use raw CSS or CSS Modules (unless Tailwind is explicitly installed).
3. Do NOT use pure `#000000` or `#FFFFFF` unless for the video player container itself.
4. Keep the UI dense. Professional video tools do not have massive padding (avoid `p-8` or `p-10`, stick to `p-2`, `p-3`, `p-4`).
5. Ensure pixel-perfect alignment. All borders should be exactly `1px` crisp.
