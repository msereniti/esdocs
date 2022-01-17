import * as ReactJsxRuntime from 'react/jsx-runtime';

import { loadModule } from './loadModule';
import { getMdxProps, MdxProps } from './mdxProps';

type MdxModule = (props: MdxProps) => React.FC;

export const loadMdx = async (url: string) => {
  const articleModule = await loadModule<MdxModule>(url, {
    requirableModules: {
      'react/jsx-runtime': ReactJsxRuntime,
    },
  });

  if (articleModule) {
    return articleModule(getMdxProps());
  }
};
