// src/types/mdx.d.ts
declare module "*.mdx" {
  let MDXComponent: (props: any) => JSX.Element;
  export default MDXComponent;
}
