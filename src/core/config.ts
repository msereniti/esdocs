type GlobPattern = string;

export type EsDocsConfig = {
  pages: GlobPattern[];

  pageSetup?: {
    components?: {
      replaceRelativeImports:
        | string
        | {
            [toReplace: string]: string;
          };
    };
  };
};
