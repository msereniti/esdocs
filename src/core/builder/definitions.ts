export type PlaygroundFile = {
  playgroundId: string;
  content: string;
  extention: string;
  name: string | null;
  outputFilePath?: string;
  source: {
    path: string;
    from: {
      line: number;
      column: number;
    };
    to: {
      line: number;
      column: number;
    };
  };
};

export type Playground = {
  id: string;
  framework: string;
  files: PlaygroundFile[];
};

export type TraverseCollections = {
  programmingLanguages: string[];
  playgrounds: Playground[];
  articlesLabelsByPath: Record<string, string>;
};

export const tmpFilesPrefix = '.tmp-file_by_esdocs_had_to_be_removed_';
