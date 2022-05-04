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
  handlers: {
    js: `(expression, hostElement) => { render(expression, hostElement); }`,
    css: `(expression, hostElement) => { 
           const styleSheet = document.createElement("style");
           styleSheet.type = "text/css";
           styleSheet.innerText = expression;
           hostElement.appendChild(styleSheet);
         }`,
  },
};
