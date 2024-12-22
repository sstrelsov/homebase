import { useTheme } from "@nextui-org/use-theme";
import { Route, Routes } from "react-router-dom";
import NavigationBar from "./components/navigation/NavigationBar";
import "./css/index.css";
import BioPage from "./pages/Bio";
import LandingPage from "./pages/Landing";
import ProjectsPage from "./pages/Projects";

const App = () => {
  useTheme("system");
  return (
    <div className="font-light relative h-dvh w-full overflow-hidden">
      <NavigationBar />
      <div className="font-sans font-normal h-dvh flex flex-grow w-full items-center justify-center px-6">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/bio" element={<BioPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
