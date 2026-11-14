# Zero Requiem — Requirements & Setup Guide

> NASA Space Apps Challenge Project

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| **Node.js** | `v18.0.0` | v22 LTS recommended (tested on v22.23.2) |
| **npm** | `v9.0.0` | Bundled with Node.js (tested on v10.9.8) |

> **Tip:** Use [nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage Node versions easily.

---

## Project Structure

All application code is consolidated under the **`frontend`** directory:

```
Zero_Requiem/
├── frontend/
│   ├── public/                 # Static assets (data, videos, icons)
│   └── src/
│       ├── app/                # Router & core app configuration
│       ├── assets/             # Global image & vector assets
│       ├── modes/
│       │   ├── game/           # Game mode: screens, components, systems
│       │   │   ├── assets/images/   # Character & background sprites
│       │   │   ├── components/buttons/  # Reusable UI controls (RadarButton)
│       │   │   └── screens/         # Screens (Menu, Cutscene, Loading, Scanning, Discover)
│       │   └── map/            # Map mode: OpenLayers & Three.js visualization
│       └── shared/             # Shared types, data, coordinates
├── README.md
└── REQUIREMENTS.md
```

---

## Dependencies (`frontend`)

**Stack:** React 19, TypeScript, Vite, Three.js, OpenLayers, Zustand, React Router

### Runtime (`dependencies`)
| Package | Version | Description |
|---------|---------|-------------|
| `react` | ^19.3.1 | UI library |
| `react-dom` | ^19.3.1 | DOM renderer for React |
| `react-router-dom` | ^7.18.5 | Client-side routing |
| `three` | ^0.187.0 | 3D rendering for planets & scenes |
| `ol` (OpenLayers) | ^10.11.0 | Geospatial mapping layer |
| `zustand` | ^5.1.0 | Client state management |

### Dev (`devDependencies`)
| Package | Version | Description |
|---------|---------|-------------|
| `vite` | ^8.3.6 | Fast development server & bundler |
| `vitest` | ^5.1.0 | Testing framework |
| `typescript` | ~6.0.3 | TypeScript compiler |
| `@vitejs/plugin-react` | ^6.1.2 | Vite plugin for React Fast Refresh |
| `eslint` | ^10.14.0 | Linter |
| `eslint-plugin-react-hooks` | ^7.1.1 | React Hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.5.7 | Fast Refresh lint rules |
| `typescript-eslint` | ^8.72.1 | TypeScript tooling for ESLint |
| `@types/react` | ^19.3.0 | React type definitions |
| `@types/react-dom` | ^19.3.0 | React DOM type definitions |
| `@types/three` | ^0.187.0 | Three.js type definitions |
| `@types/node` | ^24.19.2 | Node.js type definitions |
| `@eslint/js` | ^10.0.1 | ESLint core JavaScript rules |
| `globals` | ^17.13.0 | Global identifiers for linting |

---

## Install & Run

```bash
# Clone the repository
git clone <repo-url>
cd Zero_Requiem/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Dev | `npm run dev` | Launch local Vite dev server with HMR |
| Build | `npm run build` | Type-check (`tsc -b`) and build for production (`vite build`) |
| Preview | `npm run preview` | Locally preview production build |
| Lint | `npm run lint` | Run ESLint across the codebase |

### Application Routes

| Path | Screen | Description |
|------|--------|-------------|
| `/` | `MenuScreen` | Main menu & planetary 3D view |
| `/cutscene` | `CutsceneScreen` | Intro transmission video |
| `/loading` | `LoadingScreen` | Uplink calibration & loading screen |
| `/map` | `MapMode` | Mars surface mapping mode |
| `/game` | `GameMode` | Main game mode |
| `/scan` | `ScanningScreen` | Character scanning & discovery interaction |
| `/discover` | `CharacterDiscover` | Bestiary radar discovery scene |

---

## Notes

- `node_modules/` and `dist/` are gitignored — always run `npm install` after cloning or pulling.
- `character-app` has been migrated into `frontend/src/modes/game/`.
- Component buttons like `RadarButton` reside in `frontend/src/modes/game/components/buttons/`.
