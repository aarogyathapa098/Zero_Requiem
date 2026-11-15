/* eslint-disable react-refresh/only-export-components -- this is the router config, not a component module */
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

const MenuScreen = lazy(() => import("../modes/game/screens/MenuScreen"));
const CutsceneScreen = lazy(() => import("../modes/game/screens/CutsceneScreen"));
const LoadingScreen = lazy(() => import("../modes/game/screens/LoadingScreen"));
const MapMode = lazy(() => import("../modes/map/MapMode"));
const ScanningScreen = lazy(() => import("../modes/game/screens/ScanningScreen"));
const CharacterDiscover = lazy(() => import("../modes/game/screens/CharacterDiscover"));
const BattleScreen = lazy(() => import("../modes/game/screens/BattleScreen"));

export const router = createBrowserRouter([
  { path: "/", element: <Suspense fallback={null}><MapMode /></Suspense> },
  { path: "/map", element: <Suspense fallback={null}><MapMode /></Suspense> },
  { path: "/game", element: <Suspense fallback={null}><MenuScreen /></Suspense> },
  { path: "/menu", element: <Suspense fallback={null}><MenuScreen /></Suspense> },
  { path: "/cutscene", element: <Suspense fallback={null}><CutsceneScreen /></Suspense> },
  { path: "/loading", element: <Suspense fallback={null}><LoadingScreen /></Suspense> },
  { path: "/scan", element: <Suspense fallback={null}><ScanningScreen /></Suspense> },
  { path: "/discover", element: <Suspense fallback={null}><CharacterDiscover /></Suspense> },
  { path: "/battle", element: <Suspense fallback={null}><BattleScreen /></Suspense> },
]);
