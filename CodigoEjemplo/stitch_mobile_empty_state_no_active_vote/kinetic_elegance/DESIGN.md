# Design System Strategy: Editorial Vitality

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Structured Pulse."** 

We are moving away from the "SaaS-template" look. This system bridges the gap between high-end editorial sophistication and a high-energy, youthful spirit. We achieve this through a "tight-meets-loose" philosophy: typography and grids remain disciplined and authoritative, while color usage and corner geometry are fluid and energetic. 

To break the standard grid, we lean into **intentional asymmetry**. Hero elements should overlap container boundaries, and white space is used not just as a gap, but as a structural element that allows the vibrant blue and deep maroon to "breathe" without feeling overwhelming.

---

## 2. Colors & Surface Philosophy
The palette is built on the tension between the authoritative `primary` (#004ac6) and the energetic `secondary` (#b22b1d). 

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning. We define boundaries through tonal shifts. A section does not "end" with a line; it transitions from `surface` (#f8f9fa) to `surface-container-low` (#f3f4f5).

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials.
*   **Base:** `surface-container-lowest` (#ffffff) for the main canvas.
*   **Secondary Content:** `surface-container` (#edeeef) for sidebars or secondary modules.
*   **Active Elements:** `surface-bright` (#f8f9fa) for cards that need to "pop."
*   **Depth:** Use `surface-container-highest` (#e1e3e4) only for the most recessed elements, like search bars or inactive input containers.

### The "Glass & Gradient" Rule
To add "soul" to the digital interface:
*   **Glassmorphism:** For floating navigation or modals, use `surface` at 80% opacity with a `backdrop-filter: blur(20px)`.
*   **Signature Textures:** For primary CTAs and Hero backgrounds, use a subtle linear gradient: `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle. This prevents the "flat-blue-box" look and adds professional luster.

---

### 3. Typography: The Editorial Voice
We utilize a dual-personality type system. **Plus Jakarta Sans** provides a modern, slightly geometric energy for high-impact moments, while **Inter** maintains rock-solid readability for functional tasks.

*   **Display (Plus Jakarta Sans):** Large, bold, and confident. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an "Editorial" feel.
*   **Headline (Plus Jakarta Sans):** Used for section starts. `headline-lg` (2.0rem) ensures the hierarchy is unmistakable.
*   **Body (Inter):** The workhorse. Use `body-lg` (1rem) for most reading experiences to ensure accessibility.
*   **Labels (Inter):** All-caps or high-weight `label-md` (0.75rem) should be used for metadata to contrast against the playful curves of the containers.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card on top of a `surface-container-low` background. The shift in hex value creates a soft, sophisticated "lift."
*   **Ambient Shadows:** If a card must float, use an multi-layered ambient shadow. 
    *   *Example:* `box-shadow: 0 4px 6px -1px rgba(0, 74, 198, 0.04), 0 10px 15px -3px rgba(0, 74, 198, 0.08);`
    *   **Note:** Use a tiny percentage of the `on-surface` or `primary` color in the shadow to keep it "warm" rather than "dirty grey."
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` (#c3c6d7) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons
*   **Primary:** Large (min-height: 56px), `lg` radius (2rem), using the Primary-to-Primary-Container gradient. White text (`on_primary`).
*   **Secondary:** Maroon (`secondary`), used sparingly for high-intent actions like "Delete" or "Alert."
*   **Tertiary:** Transparent background with `primary` text. Use for low-emphasis actions like "Cancel."

### Chips
*   **Style:** `full` radius (9999px). 
*   **Color:** Use `primary_fixed` (#dbe1ff) for backgrounds with `on_primary_fixed` (#00174b) for text. This creates the "Youthful Dynamic" pastel look without sacrificing legibility.

### Inputs & Fields
*   **Shape:** `md` radius (1.5rem).
*   **Color:** `surface-container-high` (#e7e8e9). On focus, transition the background to `surface-container-lowest` (#ffffff) and add a 2px `primary` ghost border (20% opacity).

### Cards & Lists
*   **The "No-Divider" Rule:** Vertical white space is your divider. Use the Spacing Scale (typically 24px or 32px gaps) to separate list items. 
*   **Radius:** Cards must use `lg` (2rem) or `xl` (3rem) radius to lean into the "friendly and approachable" mandate.

### Contextual Components
*   **The Vitality Badge:** Small, high-contrast badges using `secondary_container` (#fe624e) to highlight "New" or "Live" items, injecting the "Energetic" requirement into the "Sophisticated" layout.

---

## 6. Do’s and Don'ts

### Do:
*   **Do** use generous whitespace (32px, 48px, 64px) to create an "expensive" feel.
*   **Do** overlap elements. Let an image break out of its container slightly to create a dynamic, custom feel.
*   **Do** use the Pastel variants (`primary_fixed`, `secondary_fixed`) for large background areas to keep the app energetic but soft on the eyes.

### Don't:
*   **Don't** use black (#000000) for text. Use `on_surface` (#191c1d) for a softer, premium look.
*   **Don't** use sharp corners. The minimum radius allowed for any interactive element is `sm` (0.5rem), but the preference is always `md` (1.5rem) or higher.
*   **Don't** use standard "drop shadows." If it looks like a default Figma shadow, it is wrong. It must be diffused and tinted.
*   **Don't** use divider lines. If you feel the need to add a line, try increasing the vertical padding instead.