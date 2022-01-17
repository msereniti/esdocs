import { uniqueId } from '../utils/uniqueId';
import { TraverseCollections } from './definitions';

const linearUnshift = <T extends any[]>(arr: T, toUnshift: T) => {
  arr.reverse();
  arr.push([...toUnshift].reverse());
  arr.reverse();

  return arr;
};

const createPlaygroundForCodeContent = ({
  id,
  language,
  content,
  framework,
}: {
  id: string;
  language: string;
  content: string;
  framework: string;
}) =>
  JSON.stringify({
    __type: 'EsDocsPlayground',
    id,
    language,
    content,
    framework,
  });

export const getArticlesHandler =
  (sourceFilePath: string, traverseCollections: TraverseCollections) =>
  () =>
  (markdownAst: any) => {
    const toTraverse = [...markdownAst.children].flat();

    while (toTraverse.length > 0) {
      const block = toTraverse.pop();

      const isCode = block.type === 'code';
      const isPureCode =
        isCode && block.meta && block.meta.split(' ').includes('pure');

      if (isCode) {
        traverseCollections.programmingLanguages.push(block.lang);
      }
      if (isCode && !isPureCode) {
        const id = uniqueId('playground');
        const language = block.lang;
        const content = block.value;
        /* TBD: get real framework */
        const framework = 'react';

        block.value = createPlaygroundForCodeContent({
          id,
          language,
          content,
          framework,
        });

        traverseCollections.playgrounds.push({
          id,
          content,
          framework,
          extension: language,
          sourceFilePath,
        });
      }

      const isHeading = block.type === 'heading';
      const isUsedAsLabel =
        traverseCollections.articlesLabelsByPath[sourceFilePath];

      if (isHeading && !isUsedAsLabel) {
        const content = block.children?.[0]?.value;

        if (typeof content === 'string') {
          traverseCollections.articlesLabelsByPath[sourceFilePath] = content;
        }
      }
      if (block.children?.length > 0) {
        linearUnshift(toTraverse, block.children.flat());
      }
    }
  };
