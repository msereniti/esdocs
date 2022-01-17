export type Playground = {
  id: string;
  content: string;
  extension: string;
  sourceFilePath: string;
  framework: string;
};

export type TraverseCollections = {
  programmingLanguages: string[];
  playgrounds: Playground[];
  articlesLabelsByPath: Record<string, string>;
};

export const tmpFilesPrefix = '.tmp-file_by_esdocs_had_to_be_removed_';
