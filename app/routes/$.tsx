import HomebaseLink from "~/components/HomebaseLink";

const SplatPage = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-center text-md sm:text-xl">
      <p>Oops! Looks like we got a 404.</p>
      <HomebaseLink href="/">Head back home</HomebaseLink>
    </div>
  );
};

export default SplatPage;
