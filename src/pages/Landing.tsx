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
        className="
          relative
          hover:cursor-pointer 
          transition-transform
          duration-300
          ease-in-out
          hover:scale-105
          active:scale-95
        "
        src="/images/strelsov-headshot.png"
        alt="Spencer Strelsov Headshot"
        width={240}
        isBlurred
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
