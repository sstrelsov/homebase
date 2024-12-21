import { Route, Routes } from "react-router-dom";
import NavigationBar from "./components/navigation/NavigationBar";
import "./css/index.css";
import BioPage from "./pages/Bio";
import LandingPage from "./pages/Landing";
import ProjectsPage from "./pages/Projects";

const App = () => {
  return (
    <div className="h-dvh flex flex-col">
      <NavigationBar />
      <div className="flex w-full flex-grow items-center justify-center px-6">
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
