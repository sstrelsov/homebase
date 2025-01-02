// src/App.tsx
import { AppRouter } from "./components/AppRouter";
import NavigationBar from "./components/navigation/NavigationBar";
import "./css/index.css";

const App = () => {
  return (
    <div className="font-light relative h-dvh w-full overflow-hidden">
      <NavigationBar />
      <div className="font-sans font-normal h-dvh flex flex-grow w-full items-center justify-center overflow-y-auto">
        <AppRouter />
      </div>
    </div>
  );
};

export default App;
