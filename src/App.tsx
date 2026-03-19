// src/App.tsx
import { Outlet } from "@tanstack/react-router";
import NavigationBar from "./components/navigation/NavigationBar";
import "./css/index.css";
import { Providers } from "./Providers";

const App = () => {
  return (
    <Providers>
      <div className="font-light relative h-dvh w-full overflow-hidden">
        <NavigationBar />
        <div className="font-sans font-normal h-dvh flex flex-grow w-full items-center justify-center overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </Providers>
  );
};

export default App;
