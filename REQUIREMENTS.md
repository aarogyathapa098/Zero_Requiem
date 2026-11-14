# Zero Requiem — Requirements & Setup Guide

> NASA Space Apps Challenge Project

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| **Node.js** | `v18.0.0` | v22 LTS recommended (tested on v22.23.2) |
| **npm** | `v9.0.0` | Bundled with Node.js |

> **Tip:** Use [nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage Node versions easily.

---

## Project Structure

This repo contains **two independent sub-applications**. Each must be installed and run separately.

```
Zero_Requiem/
├── frontend/          # Main app — React + TypeScript + Three.js + OpenLayers
└── character-app/     # Character UI — React + JSX
```

---

## 1. `frontend` — Main Application

**Stack:** React 19, TypeScript, Vite, Three.js, OpenLayers, Zustand, React Router

### Dependencies

#### Runtime (`dependencies`)
| Package | Version |
|---------|---------|
| `react` | ^19.3.1 |
| `react-dom` | ^19.3.1 |
| `react-router-dom` | ^7.18.5 |
| `three` | ^0.187.0 |
| `ol` (OpenLayers) | ^10.11.0 |
| `zustand` | ^5.1.0 |

#### Dev (`devDependencies`)
| Package | Version |
|---------|---------|
| `vite` | ^8.3.6 |
| `vitest` | ^5.1.0 |
| `typescript` | ~6.0.3 |
| `@vitejs/plugin-react` | ^6.1.2 |
| `eslint` | ^10.14.0 |
| `eslint-plugin-react-hooks` | ^7.1.1 |
| `eslint-plugin-react-refresh` | ^0.5.7 |
| `typescript-eslint` | ^8.72.1 |
| `@types/react` | ^19.3.0 |
| `@types/react-dom` | ^19.3.0 |
| `@types/three` | ^0.187.0 |
| `@types/node` | ^24.19.2 |
| `@eslint/js` | ^10.0.1 |
| `globals` | ^17.13.0 |

### Install & Run

```bash
cd frontend
npm install
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Lint with ESLint
```

---

## 2. `character-app` — Character UI

**Stack:** React 19, Vite, oxlint

### Dependencies

#### Runtime (`dependencies`)
| Package | Version |
|---------|---------|
| `react` | ^19.3.1 |
| `react-dom` | ^19.3.1 |

#### Dev (`devDependencies`)
| Package | Version |
|---------|---------|
| `vite` | ^8.3.6 |
| `@vitejs/plugin-react` | ^6.1.2 |
| `oxlint` | ^1.90.0 |
| `@types/react` | ^19.3.0 |
| `@types/react-dom` | ^19.3.0 |

### Install & Run

```bash
cd character-app
npm install
npm run dev        # Start dev server (http://localhost:5174)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Lint with oxlint
```

---

## Quick Start (both apps)

```bash
# Clone the repo
git clone <repo-url>
cd Zero_Requiem

# Terminal 1 — frontend
cd frontend && npm install && npm run dev

# Terminal 2 — character-app
cd character-app && npm install && npm run dev
```

---

## Notes

- `node_modules/` and `dist/` are gitignored — always run `npm install` after cloning or pulling changes.
- Both apps use **Vite** as the build tool; hot module replacement (HMR) is enabled in dev mode.
- `character-app` uses **oxlint** (a fast Rust-based linter) instead of ESLint.
