import { Image } from "@nextui-org/react";
import Typewriter from "./components/Typewriter";
const App = () => {
  return (
    <div className="flex flex-grow flex-col w-full h-screen items-center justify-center gap-4">
      <Image
        src="/images/strelsov-headshot.png"
        alt="Spencer Strelsov Headshot"
        isBlurred
        isZoomed
        width={240}
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

export default App;
