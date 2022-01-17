import { EsDocsFrameworkIntegration } from './frameworks';

export const reactIntegration: EsDocsFrameworkIntegration = {
  name: 'react',
  dependencies: [
    {
      import: { source: 'default', name: 'React' },
      from: 'react',
    },
    {
      import: ['render'],
      from: 'react-dom',
    },
  ],
  init: `(lastEvaluatedExpression, hostElement) => { render(lastEvaluatedExpression, hostElement); }`,
};
