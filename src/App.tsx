// src/App.jsx
import { useTheme } from "@nextui-org/use-theme";
import { Route, Routes } from "react-router-dom";
import NavigationBar from "./components/navigation/NavigationBar";
import { renderRoutes, ROUTES } from "./config/Routes";
import "./css/index.css";

const App = () => {
  useTheme("system");
  return (
    <div className="font-light relative h-dvh w-full overflow-hidden">
      <NavigationBar />
      <div className="font-sans font-normal h-dvh flex flex-grow w-full items-center justify-center overflow-y-auto">
        <Routes>
          {renderRoutes(ROUTES)}{" "}
          <Route path="*" element={<div>404 - Not Found :(</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
