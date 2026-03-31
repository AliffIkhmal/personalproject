# Design System Strategy: High-End Automotive Precision

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Precision Engineer."** 

In the world of high-performance automotive service, luxury is defined by mechanical clarity and frictionless utility. We are moving away from the "generic SaaS dashboard" look. Instead of a sea of boxes and borders, we are creating a digital workspace that feels like a clean, high-tech workshop floor. 

The design breaks the "template" look through **Tonal Monochromatism** and **Intentional Asymmetry**. We prioritize white space over lines, and depth over decoration. By using high-contrast typography (Plus Jakarta Sans for impact, Inter for utility), we create an editorial feel that treats vehicle data with the same reverence as a luxury car magazine.

## 2. Colors & Surface Logic
The palette is rooted in a deep indigo/slate foundation, providing an authoritative, "industrial-premium" atmosphere.

### The "No-Line" Rule
To achieve a high-end feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a `surface-container-low` card sitting on a `surface` background creates a natural boundary that feels integrated, not "caged."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to define importance:
- **Main Background:** `surface` (#f8f9ff)
- **Secondary Content Areas:** `surface-container-low` (#eff4ff)
- **Primary Action Cards:** `surface-container-lowest` (#ffffff)
- **Active/High-Focus Elements:** `surface-container-high` (#dce9ff)

### Signature Textures
While the dashboard remains flat and clean, CTAs and Login states should utilize **"The Indigo Pulse"**: a subtle linear gradient from `primary` (#3525cd) to `primary_container` (#4f46e5). This adds "soul" and professional polish that distinguishes a custom build from a generic UI kit.

## 3. Typography: Editorial Authority
We utilize a dual-typeface system to balance technical precision with brand character.

*   **Display & Headlines (Plus Jakarta Sans):** These are your "Hero" elements. Use `display-lg` and `headline-md` to create clear entry points for pages. The wider stance of Plus Jakarta Sans mimics automotive branding.
*   **Body & Labels (Inter):** Inter is our "Workhorse." Its high X-height ensures readability for VIN numbers, service logs, and technical specs.
*   **The Hierarchy Rule:** Never use two font sizes that are only 1px apart. Create dramatic contrast. Use `label-sm` (#464555) in uppercase with 0.05em letter spacing for category headers to create an architectural, blueprint feel.

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Stack `surface-container-lowest` cards on `surface-container-low` backgrounds. This creates a "soft lift" that feels architectural.
*   **Ambient Shadows:** For floating elements (Modals/Dropdowns), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(11, 28, 48, 0.06)`. Note the color: we use a tiny percentage of our `on_surface` (#0b1c30) rather than pure black to mimic natural light.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (#c7c4d8) at **20% opacity**. It should be felt, not seen.

## 5. Components

### Buttons & Chips
*   **Primary Button:** Uses the "Indigo Pulse" gradient. Border-radius is fixed at `md` (0.75rem / 12px). No shadow on rest; a subtle `primary_fixed` glow on hover.
*   **Status Chips:** These must be high-visibility but low-distraction. Use `tertiary_fixed_dim` for Success and `error_container` for Danger. Use `label-md` bold for the text.

### Cards & Lists
*   **The Divider Rule:** Forbid the use of divider lines. Separate list items using `spacing-4` (1rem) of vertical white space or by alternating background tints between `surface` and `surface_container_low`.
*   **Service Track Cards:** Use a `0.25rem` (4px) vertical accent bar on the left edge using the status color (Amber for In-Progress, Green for Done) to provide an instant "glance-able" status without cluttering the card.

### Input Fields
*   **State Logic:** Default state is `surface_container_low`. On focus, the background shifts to `surface_container_lowest` with a `2px` stroke of `primary`. This "pops" the field toward the user, signaling it is ready for data.

### Specialized Component: The "Service Timeline"
Instead of a standard table, use a vertical node-based layout. Nodes should be `tertiary_fixed` for completed steps, creating a "threaded" visual story of the vehicle’s journey.

## 6. Do's and Don'ts

### Do:
*   **Embrace Negative Space:** If a section feels crowded, increase spacing using the `spacing-8` or `spacing-10` tokens. High-end design breathes.
*   **Use Mono-spaced Numbers:** For VINs and Odometer readings, ensure numerical data is aligned and legible.
*   **Subtle Transitions:** Use `cubic-bezier(0.4, 0, 0.2, 1)` for all hover states. It should feel like a well-oiled machine part moving into place.

### Don't:
*   **Don't use pure black:** Use `on_background` (#0b1c30) for text to maintain a sophisticated slate-toned depth.
*   **Don't use 100% opacity borders:** It breaks the "Precision Engineer" aesthetic and makes the UI look like a legacy spreadsheet.
*   **Don't crowd the Sidebar:** The dark sidebar (`inverse_surface`) should feel like a premium cockpit. Use `spacing-6` between nav items to prevent accidental clicks.