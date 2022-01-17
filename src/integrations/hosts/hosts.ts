import { host as vanilla } from './vanilla';

type FilePath = string;
type FileContent = string;

export type EsDocsHost = {
  staticFiles: Record<FilePath, FileContent>;
};

export const defaultHosts = {
  vanilla,
};
