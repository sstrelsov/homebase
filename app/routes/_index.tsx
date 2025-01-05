import type { MetaFunction } from "@remix-run/node";
import ProfilePic from "~/components/ProfilePic";
import Typewriter from "~/components/Typewriter";
import useAtOrAboveBreakpoint from "~/utils/useAtOrAboveBreakpoint";

export const meta: MetaFunction = () => {
  return [
    { title: "Spencer Strelsov" },
    {
      name: "description",
      content:
        "Personal site for Spencer, a PM at Thomson Reuters who builds AI for lawyers.",
    },

    // -- Open Graph Meta Tags (for Facebook, Slack, iMessage, etc.) --
    { property: "og:title", content: "Spencer Strelsov" },
    {
      property: "og:description",
      content:
        "Sr. Product Manager at Thomson Reuters, building AI for lawyers & journalists.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://www.strelsov.me" },
    {
      property: "og:image",
      content: "/images/strelsov-landing.png",
    },

    // (Optional) If you want a “site name” to show in some link previews
    { property: "og:site_name", content: "Spencer Strelsov" },
  ];
};

const Index = () => {
  const isHoriztonal = useAtOrAboveBreakpoint("xl");

  const cyclingPhrases = [
    "Hey, I'm Spencer!",
    "I'm a PM at Thomson Reuters",
    "I build AI for lawyers",
    "I build AI for journalists",
    "I love coding + design",
    "I love history",
    "I love storytelling",
  ];

  const accumulatingPhrases = [
    "Hey, I'm Spencer!\n\n",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters.",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers...and sometimes journalists :)",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.\n\n I love coding + design.",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.\n\n I love coding + design. I'm passionate about history, storytelling, photography and tech.\n\n",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.\n\n I love coding + design. I'm passionate about history, storytelling, photography and tech.\n\n I'm based in Brooklyn, NY",
  ];

  return (
    <div className="xl:font-light xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8 xl:items-start px-6">
      <ProfilePic />
      <div className="flex-1 text-left text-2xl sm:text-3xl leading-relaxed xl:max-w-[30rem] xl:max-h-[25rem] xl:content-start">
        <Typewriter
          typingSpeed={isHoriztonal ? 70 : 110}
          period={isHoriztonal ? 1000 : undefined}
          deletingSpeed={isHoriztonal ? 50 : 70}
          phrases={isHoriztonal ? accumulatingPhrases : cyclingPhrases}
          loop={isHoriztonal ? false : true}
          preserveTrailingNewlines={isHoriztonal ? true : false}
        />
      </div>
    </div>
  );
};

export default Index;
