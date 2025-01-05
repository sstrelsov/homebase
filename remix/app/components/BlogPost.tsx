import { Card, CardFooter, Image } from "@nextui-org/react";
import { Frontmatter } from "~/types/frontmatter";
import useAtOrAboveBreakpoint from "~/utils/useAtOrAboveBreakpoint";

interface BlogPostProps {
  post: JSX.Element;
  frontmatter: Frontmatter;
}

const BlogPost = ({ post, frontmatter }: BlogPostProps) => {
  const isLgUp = useAtOrAboveBreakpoint("lg");
  return (
    <article className="h-full w-full flex flex-col py-4 px-4 items-center">
      <div className="flex items-center justify-center">
        <Card
          shadow="none"
          classNames={{
            base: "flex w-full h-auto bg-transparent overflow-visible items-center lg:flex-row-reverse lg:gap-10 lg:mb-10",
            body: "lg:flex-1 lg:px-10",
            footer: "justify-center flex flex-col lg:flex-1",
          }}
        >
          {!!frontmatter.imageSrc && (
            <div className="lg:flex-1 items-center">
              <Image
                width={isLgUp ? 650 : 500}
                alt="G at Cafe Belle"
                src={frontmatter.imageSrc}
              />
            </div>
          )}
          <CardFooter>
            {!!frontmatter.title && (
              <h1 className="text-4xl lg:text-5xl text-center mt-4">
                {frontmatter.title}
              </h1>
            )}
            {!!frontmatter.author && (
              <h2 className="text-sm font-light text-center mt-2">
                {frontmatter.author}
              </h2>
            )}
          </CardFooter>
        </Card>
      </div>
      <div className="w-full flex flex-col prose dark:prose-invert text-left mt-4 max-w-xl content-center">
        {post}
      </div>
    </article>
  );
};

export default BlogPost;
