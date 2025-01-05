import HomebaseLink from "../components/HomebaseLink";

const BioPage = () => {
  return (
    <div className="flex flex-col gap-4 px-6 sm:px-0 max-w-lg h-full justify-center">
      <p className="text-md xs:text-lg sm:text-xl md:text-2xl">
        I'm a Sr. Product Manager at Thomson Reuters, where I lead the R&D Team
        for CoCounsel—the world's first AI assistant for law. I also build
        AI-powered prototypes for Reuters journalists. I joined in 2022, when
        Thomson Reuters{" "}
        <HomebaseLink href="https://techcrunch.com/2023/06/26/thomson-reuters-buys-casetext-an-ai-legal-tech-startup-for-650m-in-cash/">
          acquired Casetext.
        </HomebaseLink>
      </p>
      <p className="text-md xs:text-lg sm:text-xl md:text-2xl">
        At Casetext, I led the team that built the latest iteration of{" "}
        <HomebaseLink href="https://www.fastcompany.com/91033227/casetext-thomson-reuters-most-innovative-companies-2024">
          CoCounsel.
        </HomebaseLink>{" "}
        Prior to that, I was a fullstack engineer, working on the core Casetext
        research product and Parallel Search, an AI semantic search engine for
        caselaw.
      </p>
      <p className="text-md xs:text-lg sm:text-xl md:text-2xl">
        My family immigrated from Kyiv, Ukraine in 1990, and I grew up in
        Louisville, Kentucky. I'm a first-generation college graduate, and a
        proud alumnus of Yale University, where I studied{" "}
        <HomebaseLink size="" href="/files/senior-thesis.pdf">
          history.
        </HomebaseLink>
      </p>
    </div>
  );
};
export default BioPage;
