import { Link, LinkProps } from "@nextui-org/link";
import { useLinkColor } from "../utils/ColorContext";

const HomebaseLink = ({ ...props }: LinkProps) => {
  const { linkColor } = useLinkColor();

  return (
    <Link
      className="text-inherit"
      style={{ textDecorationColor: linkColor }}
      underline="always"
      size="lg"
      {...props}
    />
  );
};

export default HomebaseLink;
