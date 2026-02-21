# Terma — Project Rules

## Styling Rules (STRICT)

This project uses **Tailwind CSS v4** as the single source of truth for styling.

### Global CSS (`main.css`) — minimal by design

The file `src/renderer/src/assets/main.css` contains ONLY:
- **`@theme`** — semantic design tokens (colors, radii, shadows)
- **`@layer base`** — CSS-reset level defaults (body, scrollbar, focus-visible, selection, input normalization). Being in `@layer base` ensures Tailwind utilities can override them naturally.
- **Electron-specific** — `.drag-region` / `.no-drag-region` (`-webkit-app-region` has no Tailwind equivalent)
- **Vendor-prefix hacks** — `.text-gradient-logo` (`-webkit-background-clip: text` / `-webkit-text-fill-color`)
- **External SVG styling** — `.file-type-icon` (styles SVGs injected via `dangerouslySetInnerHTML`, can't use Tailwind classes on them)

**Do NOT add** component-specific styles to `main.css`. All component styling lives in JSX via Tailwind classes.

### Component styling — Tailwind only

- All visual styling is done with Tailwind utility classes directly in components.
- **Never use `!important`** (including Tailwind's `!` modifier like `outline-none!`). If a base style needs overriding, fix the cascade (use `@layer base` in CSS) instead of brute-forcing specificity.
- **Never hardcode hex colors** in components. All colors must come from `@theme` tokens (`bg-danger`, `text-accent`, `bg-window-close`, etc.). If a color doesn't exist as a token, add it to `@theme` first.
- **Never create CSS classes** for things expressible with Tailwind utilities. If you need to share a set of classes across elements in one component, extract a `const` string in that component file.
- If you need a new semantic color, add it to `@theme default` in `main.css` and reference it via Tailwind (`bg-{name}`, `text-{name}`, etc.).

### Design token flow

```
:root (primitive palette)  →  @theme (semantic tokens)  →  Tailwind utilities (components)
     --palette-*                  --color-*                    bg-*, text-*, border-*
```

Primitive palette values (`--palette-*`) are defined in `:root` and are NOT exposed as Tailwind utilities.
Semantic tokens (`--color-*`) are defined in `@theme` and generate Tailwind classes automatically.
Components use ONLY Tailwind classes referencing semantic tokens.
