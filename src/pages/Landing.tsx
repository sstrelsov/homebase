import { Image } from "@nextui-org/react";
import { useTheme } from "@nextui-org/use-theme";
import Typewriter from "../components/Typewriter";

const LandingPage = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeSwitch = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="flex flex-grow flex-col w-full items-center justify-center gap-4">
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
        width={`200 sm:240`}
        isBlurred
        onClick={handleThemeSwitch}
      />
      <Typewriter
        typingSpeed={130}
        deletingSpeed={70}
        phrases={[
          "Hey, I'm Spencer!",
          "I'm a PM at Thomson Reuters",
          "I build AI for humans",
          "I build AI for lawyers",
          "I build AI for journalists",
          "I love coding + design",
          "I love history",
          "I love storytelling",
        ]}
      />
    </div>
  );
};

export default LandingPage;
