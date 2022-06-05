import { Content as MdxAstNode, Root as MdxAstRoot } from '@mdx-js/mdx/lib/plugin/remark-mark-and-unravel';
import { Code as MdxCodeBlockNode } from 'mdast';

import { PlaygroundCodeDefinition, PlaygroundCodeDefinitionString } from '../../common/definitions';
import { getConfiguration } from '../configuration/configuration';
import { uniqueId } from '../utils/uniqueId';
import { Playground, PlaygroundFile, TraverseCollections } from './definitions';

const createPlaygroundCodeDefinition = (playgroundId: string) => {
  const definition: PlaygroundCodeDefinition = {
    __type: 'EsDocsPlayground',
    playgroundId,
  };

  return JSON.stringify(definition) as PlaygroundCodeDefinitionString;
};

const mapMarkdownChildren = (children: MdxAstNode[], traverseCollections: TraverseCollections, sourceFilePath: string) => {
  const result: MdxAstNode[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    let typeToHandle: 'code' | 'heading' | null = null;
    let blockAdded = false;

    if (child.type === 'code') {
      typeToHandle = 'code';
    } else if (
      child.type === 'heading' &&
      child.children?.[0] &&
      'value' in child.children[0] &&
      child.children[0].value &&
      !traverseCollections.articlesLabelsByPath[sourceFilePath]
    ) {
      typeToHandle = 'heading';
    }

    if (typeToHandle === 'code' && child.type === 'code' && !child.meta?.toLowerCase().split(' ').includes('pure')) {
      const playgroundId = uniqueId('playground');
      const files: PlaygroundFile[] = [];

      for (; i < children.length && children[i].type === 'code'; i++) {
        const codeBlock = children[i] as MdxCodeBlockNode;
        const { lang: extention, value: content, meta, position } = codeBlock;

        if (!position) {
          console.error(codeBlock);
          throw new Error(`Unexpectedly markdown token #${i} from ${sourceFilePath} was parsed without token position. Full token ast is output above.`);
        }

        const name = meta ?? null;
        const tokens = (name ?? '').toLowerCase().split(' ');
        const isPure = tokens.includes('pure');

        if (isPure) {
          i--;
          break;
        }

        // TBD: validate name for extension

        files.push({
          playgroundId,
          content,
          extention: extention ?? 'plain',
          name,
          source: {
            path: sourceFilePath,
            from: position.start,
            to: position.end,
          },
        });
      }

      if (files.length > 0) {
        const framework = getConfiguration(sourceFilePath).framework as any;

        const playground: Playground = {
          id: playgroundId,
          framework,
          files,
        };

        result.push({
          ...child,
          value: createPlaygroundCodeDefinition(playground.id),
        });
        blockAdded = true;

        traverseCollections.playgrounds.push(playground);
      }
    } else if (typeToHandle === 'heading' && child.type === 'heading' && 'value' in child.children[0]) {
      const content = child.children[0].value;

      if (typeof content === 'string') {
        traverseCollections.articlesLabelsByPath[sourceFilePath] = content;
      }
    }

    if (!blockAdded) {
      if ('children' in child) {
        child.children = mapMarkdownChildren(child.children, traverseCollections, sourceFilePath) as any;
      }

      result.push(child);
    }
  }

  return result;
};

export const getArticlesHandler = (sourceFilePath: string, traverseCollections: TraverseCollections) => () => (markdownAst: MdxAstRoot) => {
  markdownAst.children = mapMarkdownChildren(markdownAst.children, traverseCollections, sourceFilePath);
};
