import { EsDocsConfig } from '../src/core/config';

export const config: EsDocsConfig = {
  pages: ['./components/*.mdx?'],
  pageSetup: {
    components: {
      replaceRelativeImports: 'great-components-library',
    },
  },
};
