import { MDXComponents } from 'mdx/types';
import React from 'react';

import { PlaygroundCodeDefinition } from '../../common/definitions';
import { PlaygroundView } from '../playground/playground';

export type MdxProps = {
  components: MDXComponents;
};

export const getMdxProps = (): MdxProps => ({
  components: {
    code: (props) => {
      if (typeof props.children === 'string' && props.children.trim().startsWith('{') && props.children.trim().endsWith('}')) {
        let playgroundDenition: PlaygroundCodeDefinition | null = null;

        try {
          playgroundDenition = JSON.parse(props.children);
        } catch (err) {
          /* TBD: handle in some way */
        }

        if (playgroundDenition?.__type === 'EsDocsPlayground') {
          return <PlaygroundView playgroundId={playgroundDenition.playgroundId} />;
        }
      }

      return <code className={props.className}>{props.children}</code>;
    },
  },
});
