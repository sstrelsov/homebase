import { Route, Routes } from "react-router-dom";
import NavigationBar from "./components/NavigationBar";
import "./css/index.css";
import BioPage from "./pages/Bio";
import LandingPage from "./pages/Landing";
import ProjectsPage from "./pages/Projects";
const App = () => {
  return (
    <div className="h-screen flex flex-col">
      <NavigationBar />
      <div className="flex w-full h-full items-center justify-center">
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
