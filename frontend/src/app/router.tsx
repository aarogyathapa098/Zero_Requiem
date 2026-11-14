import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

const MapMode = lazy(() => import("../modes/map/MapMode"));
const GameMode = lazy(() => import("../modes/game/GameMode"));

export const router = createBrowserRouter([
  { path: "/", element: <Suspense fallback={null}><MapMode /></Suspense> },
  { path: "/game", element: <Suspense fallback={null}><GameMode /></Suspense> },
]);