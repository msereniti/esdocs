import { reactIntegration } from './react';

type Code = string;

export type EsDocsFrameworkIntegration = {
  name: string;
  dependencies: {
    import: { source: '*' | 'default'; name: string } | string[];
    from: string;
  }[];
  external?: string[];
  init: `(lastEvaluatedExpression, hostElement) => {${Code}}`;
};

export const outOfTheBoxFrameworks = {
  react: reactIntegration,
};
