// src/App.jsx
import { useTheme } from "@nextui-org/use-theme";
import { Route, Routes } from "react-router-dom";
import NavigationBar from "./components/navigation/NavigationBar";
import "./css/index.css";
import BioPage from "./pages/Bio";
import LandingPage from "./pages/Landing";
import ProjectsPage from "./pages/Projects";
import ProjectDetail from "./pages/poject-details/ProjectDetails";

const App = () => {
  useTheme("system");
  return (
    <div className="font-light relative h-dvh w-full overflow-hidden">
      <NavigationBar />
      <div className="font-sans font-normal h-dvh flex flex-grow w-full items-center justify-center overflow-y-auto">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          {/* Dynamic route for any project key */}
          <Route path="/projects/:projectSlug" element={<ProjectDetail />} />

          <Route path="/bio" element={<BioPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
