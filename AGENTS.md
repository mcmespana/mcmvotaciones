# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`: `components/` (feature/UI components; shadcn under `components/ui`), `pages/` (route views), `hooks/`, and `lib/`.
- Entrypoints: `index.html`, `src/main.tsx`, and `src/App.tsx`. Static assets are in `public/`.
- Routing is defined in `src/App.tsx` (`react-router-dom`). Add new routes above the catch‑all `*` route.
- Path alias: `@` → `src` (see `tsconfig.json` and `vite.config.ts`). Example: `import { Button } from "@/components/ui/button"`.

## Build, Test, and Development Commands
- `npm i`: install dependencies.
- `npm run dev`: start Vite dev server at `http://localhost:8080`.
- `npm run build`: production build to `dist/`.
- `npm run build:dev`: development‑mode build (useful for debugging builds).
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint (TypeScript + React Hooks rules).

## Coding Style & Naming Conventions
- Use TypeScript and React functional components. Prefer named exports, 2‑space indent, and semicolons.
- Components: PascalCase files in `src/components` (e.g., `FeatureCard.tsx`). Hooks: `useX.ts(x)` in `src/hooks`.
- Keep styles with Tailwind utility classes; reuse primitives from `src/components/ui`.
- Fix all ESLint findings before pushing; config is in `eslint.config.js`.

## Testing Guidelines
- No formal test suite yet. Validate changes with `npm run dev` (smoke test key flows) and `npm run preview`.
- If introducing tests, prefer Vitest + React Testing Library. Name files `*.test.tsx` next to the module.

## Commit & Pull Request Guidelines
- History mixes styles; prefer Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`. Example: `fix: add missing ActivitiesSection import`.
- Write imperative, concise subjects (≤72 chars). Include context in body when needed.
- PRs must include: clear description, linked issues, screenshots for UI, and reproduction steps. Ensure `npm run lint` passes and the app runs cleanly.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local`; only client‑safe vars prefixed `VITE_` are exposed by Vite.
- Follow the design tokens in `tailwind.config.ts` to keep colors, spacing, and radii consistent.

