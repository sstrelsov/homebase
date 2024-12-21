import { Image } from "@nextui-org/react";
import { useTheme } from "@nextui-org/use-theme";
import Typewriter from "../components/Typewriter";
const LandingPage = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeSwitch = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="flex flex-grow flex-col w-full h-full items-center justify-center gap-4">
      <Image
        className="hover:cursor-pointer"
        src="/images/strelsov-headshot.png"
        alt="Spencer Strelsov Headshot"
        isBlurred
        isZoomed
        width={240}
        onClick={handleThemeSwitch}
      />
      <Typewriter
        phrases={[
          "Hey, I'm Spencer!",
          "I'm a PM working in AI and law",
          "I'm based out of Brooklyn",
        ]}
      />
    </div>
  );
};

export default LandingPage;
