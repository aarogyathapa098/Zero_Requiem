/* eslint-disable react-refresh/only-export-components -- this is the router config, not a component module */
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

const MenuScreen = lazy(() => import("../modes/game/screens/MenuScreen"));
const CutsceneScreen = lazy(() => import("../modes/game/screens/CutsceneScreen"));
const LoadingScreen = lazy(() => import("../modes/game/screens/LoadingScreen"));
const MapMode = lazy(() => import("../modes/map/MapMode"));
const GameMode = lazy(() => import("../modes/game/GameMode"));

export const router = createBrowserRouter([
  { path: "/", element: <Suspense fallback={null}><MenuScreen /></Suspense> },
  { path: "/cutscene", element: <Suspense fallback={null}><CutsceneScreen /></Suspense> },
  { path: "/loading", element: <Suspense fallback={null}><LoadingScreen /></Suspense> },
  { path: "/map", element: <Suspense fallback={null}><MapMode /></Suspense> },
  { path: "/game", element: <Suspense fallback={null}><GameMode /></Suspense> },
]);
