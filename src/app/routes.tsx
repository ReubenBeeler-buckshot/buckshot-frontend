import { createBrowserRouter, Navigate } from "react-router";
import Root from "./components/Root";
import About from "./components/About";
import Gallery from "./components/Gallery";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: <Navigate to="/about" replace /> },
      { path: "about", Component: About },
      { path: "gallery", Component: Gallery },
    ],
  },
]);