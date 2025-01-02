import type { MDXComponents } from "mdx/types";
import { CodeBlock } from "../components/CodeBlock";

export const components: MDXComponents = {
  h1: (props) => (
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal " {...props} />
  ),
  h2: (props) => <h2 className="font-normal" {...props} />,
  h3: (props) => <h3 className="font-normal" {...props} />,
  h4: (props) => <h4 className="font-normal" {...props} />,
  h5: (props) => <h5 className="font-normal" {...props} />,
  h6: (props) => <h6 className="font-normal" {...props} />,
  p: (props) => <p className="text-medium" {...props} />,
  address: (props) => <address className="text-xs not-italic" {...props} />,
  code: (props) => <CodeBlock {...props} />,
};
