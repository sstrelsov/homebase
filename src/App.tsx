// src/App.tsx
import { Outlet, useLocation } from "@tanstack/react-router";
import NavigationBar from "./components/navigation/NavigationBar";
import "./css/index.css";
import { Providers } from "./Providers";
import { HeadContent } from "./router";

const App = () => {
  // Stached takes the whole screen and scrolls the page itself, so phone
  // browsers draw it under their toolbars instead of stopping at them.
  const isStached = useLocation().pathname.startsWith("/stached");

  return (
    <Providers>
      <HeadContent />
      {isStached ? (
        <Outlet />
      ) : (
        <div className="font-light relative h-dvh w-full overflow-hidden">
          <NavigationBar />
          <div className="font-sans font-normal h-dvh flex flex-grow w-full items-center justify-center overflow-y-auto">
            <Outlet />
          </div>
        </div>
      )}
    </Providers>
  );
};

export default App;
