import { reactIntegration } from './react';

type Code = string;

export type EsDocsFrameworkIntegration = {
  name: string;
  dependencies: {
    import: { source: '*' | 'default'; name: string } | string[];
    from: string;
  }[];
  external?: string[];
  handlers: {
    [fileExtention: string]: `(expression, hostElement) => {${Code}}`;
  };
};

export const outOfTheBoxFrameworks = {
  react: reactIntegration,
};
