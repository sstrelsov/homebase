// src/config/Routes.tsx
import { Route, Routes } from "react-router-dom";
import { renderRoutes, ROUTES } from "../config/Routes";

export const AppRouter = () => {
  return (
    <Routes>
      {renderRoutes(ROUTES)}
      <Route path="*" element={<div>404 - Not Found :(</div>} />
    </Routes>
  );
};
