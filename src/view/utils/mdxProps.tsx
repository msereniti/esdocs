import { MDXComponents } from 'mdx/types';
import React from 'react';

import { Playground } from '../playground/playground';

export type MdxProps = {
  components: MDXComponents;
};

export const getMdxProps = (): MdxProps => ({
  components: {
    code: (props) => {
      if (
        typeof props.children === 'string' &&
        props.children.trim().startsWith('{') &&
        props.children.trim().endsWith('}')
      ) {
        let codeDescription: {
          __type: 'EsDocsPlayground';
          id: string;
          language: string;
          content: string;
          framework: string;
        } | null = null;

        try {
          codeDescription = JSON.parse(props.children);
        } catch (err) {
          /* TBD: handle in some way */
        }

        if (codeDescription?.__type === 'EsDocsPlayground') {
          const playgroundId = codeDescription.id;
          const { language, content, framework } = codeDescription;

          return (
            <Playground
              playgroundId={playgroundId}
              language={language}
              sourceCode={content}
              framework={framework}
            />
          );
        }
      }

      return <code className={props.className}>{props.children}</code>;
    },
  },
});
