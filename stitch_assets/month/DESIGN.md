# Design System Strategy: The Analytical Layer

## 1. Overview & Creative North Star
**Creative North Star: The Precision Ateliers**
This design system moves away from the "standard dashboard" aesthetic into a high-end, editorial space designed for the modern knowledge worker. It treats data as art—combining the clinical precision of a productivity tool with the soft, intentional layering of a premium digital journal.

Instead of rigid grids and harsh borders, we utilize **Asymmetric Informational Density**. This means grouping critical data in large, high-contrast typography while allowing secondary metrics to breathe within expansive, soft-lit containers. We break the "template" feel by overlapping data visualizations slightly over container edges and using a typography scale that favors dramatic shifts in size to establish a clear, authoritative hierarchy.

---

## 2. Colors & Surface Philosophy

The palette is anchored in technical deep blues (`primary: #004ac6`) and focused highlights (`secondary: #6b38d4`). The goal is to create an interface that feels like it’s glowing with information rather than just displaying it.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural separation must be achieved through:
*   **Tonal Shifts:** Placing a `surface_container_low` card on a `surface` background.
*   **Negative Space:** Using the **Spacing Scale (8 or 10)** to create natural islands of information.
*   **Layered Elevation:** Using shadows to lift elements rather than lines to box them in.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-opaque materials.
*   **Base:** `surface` (#f7f9fb) – The desk.
*   **Secondary Sections:** `surface_container_low` (#f2f4f6) – The layout foundations.
*   **Interactive Cards:** `surface_container_lowest` (#ffffff) – The active "paper" where data lives.

### The Glass & Gradient Rule
To provide a "signature" feel, floating navigation elements or modal overlays should use **Glassmorphism**:
*   **Background:** `surface_container_lowest` at 80% opacity.
*   **Effect:** `backdrop-blur: 20px`.
*   **CTAs:** Use a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle to add depth and "soul" to action points.

---

## 3. Typography
We use **Inter** as the primary typeface, leaning heavily into its variable weights to create an editorial flow.

*   **Display (lg/md):** Reserved for high-level daily aggregates (e.g., total keystrokes). Set these with a tight letter-spacing (-0.02em) to look "custom-built."
*   **Headline (sm/md):** Used for section titles. These should be paired with `primary` color icons to anchor the eye.
*   **Body (md):** Our workhorse for data labels. Ensure `on_surface_variant` (#434655) is used for descriptions to keep the visual weight light.
*   **Label (md/sm):** Used for technical metadata. These should often be set in `ALL CAPS` with a slight letter-spacing (+0.05em) for a "Quantified Self" aesthetic.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved by stacking. A card (`surface_container_lowest`) placed on a section (`surface_container`) provides enough contrast to be "read" as an object without a single line of CSS border.

### Ambient Shadows
For floating elements like tooltips or active cards:
*   **Blur:** 24px to 40px.
*   **Opacity:** 4% - 6%.
*   **Tint:** Use a shadow color based on `on_surface` (#191c1e) to ensure it feels like a natural shadow cast by the UI elements.

### The "Ghost Border" Fallback
If accessibility requirements demand a border, use the **Ghost Border**:
*   `outline_variant` (#c3c6d7) at **15% opacity**. This creates a "suggestion" of a boundary that doesn't clutter the visual field.

---

## 5. Components

### Buttons
*   **Primary:** Gradient-filled (Primary to Primary-Container), `xl` (0.75rem) rounded corners. Bold, confident.
*   **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` text. No border.
*   **Tertiary:** Transparent background, `primary` text. Use for low-emphasis actions like "View Details."

### Data Cards
*   **Styling:** Background `surface_container_lowest`, no border, `xl` rounding.
*   **Internal Layout:** Never use divider lines. Use `spacing.6` (1.5rem) to separate the title from the metric.

### Chips (High-Frequency Stats)
*   Used for keyboard shortcuts (e.g., `Ctrl+C`).
*   **Styling:** `surface_container` background, `label-md` typography. Use `secondary` (#6b38d4) for active or "high-frequency" highlights.

### Input Fields
*   **Style:** `surface_container_low` background. 
*   **Focus State:** A soft 2px outer glow (not a border) using `primary` at 20% opacity.
*   **Error:** Background `error_container`, text `on_error_container`.

### Progress Bars (The "Pulse")
*   Use `secondary` for the track and a `surface_variant` for the background. The bar should have `full` (9999px) rounding to feel organic and "soft."

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a functional tool. If a section feels crowded, increase the spacing token before adding a line.
*   **DO** use `secondary` (Purple) sparingly. It is a "reward" color for milestones or peak productivity moments.
*   **DO** align text-heavy data to a strict baseline, but allow icons or decorative elements to sit slightly "off-axis" for an editorial feel.

### Don't
*   **DON'T** use black (#000000) for shadows or text. Use `on_surface` and its variants to maintain the refined gray-blue atmosphere.
*   **DON'T** use the `none` or `sm` roundedness tokens for containers. This system relies on `lg` and `xl` to maintain a "friendly-professional" tone.
*   **DON'T** ever use a 100% opaque `outline`. It breaks the illusion of layered glass and paper.