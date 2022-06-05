import { compile as compileMdx } from '@mdx-js/mdx';
import { Plugin as EsBuildPlugin } from 'esbuild';
import { fileURLToPath } from 'url';

import { getConfiguration } from '../configuration/configuration';
import { resolveTypings } from '../typings/typings';
import { esDocsFs } from '../utils/fs';
import { TraverseCollections } from './definitions';
import { getArticlesHandler } from './handleArticles';

export const getMdxHandler = (traverseCollections: TraverseCollections): EsBuildPlugin => ({
  name: 'esdocs-esbuild-mdx',
  setup: (build) => {
    build.onLoad({ filter: /\.mdx?$/ }, async (args) => {
      const text = await esDocsFs.readFile(args.path);
      let tsEscapedText = text;
      let prepand = '';

      if (tsEscapedText.includes('structOf(')) {
        const structOfExpressions: { value: string; start: number; end: number; index: number }[] = [];
        let brackets = 0;
        let expressionStartIndex = -1;
        for (let i = 0; i < tsEscapedText.length; i++) {
          if (tsEscapedText.substring(i, i + 'structOf('.length) === 'structOf(') {
            if (brackets > 0) {
              const row = text.substring(0, i).split('\n').length;
              const column = i - text.substring(0, i).lastIndexOf('\n');
              throw new Error(`Unable to handle nested structOf( (in ${args.path}:${row}:${column})`);
            }
            brackets++;
            i += 'structOf('.length - 1;
            expressionStartIndex = i + 1;
          } else if (tsEscapedText[i] === '(' && brackets > 0) {
            brackets++;
          } else if (tsEscapedText[i] === ')' && brackets > 0) {
            brackets--;
            if (brackets === 0) {
              const expressionEndIndex = i;
              const expression = tsEscapedText.substring(expressionStartIndex, expressionEndIndex);
              structOfExpressions.push({
                value: expression,
                start: expressionStartIndex,
                end: expressionEndIndex,
                index: structOfExpressions.length,
              });
            }
          }
        }
        for (let i = structOfExpressions.length - 1; i >= 0; i--) {
          const { start, end, index } = structOfExpressions[i];
          tsEscapedText = tsEscapedText.substring(0, start) + `"_esDocsEscapedType_${index}"` + tsEscapedText.substring(end);
        }
        const escapedDeclarations = structOfExpressions
          .map((expression, index) => {
            if (expression.value.includes('typeof ')) {
              const row = text.substring(0, expression.start).split('\n').length;
              const column = expression.start - text.substring(0, expression.start).lastIndexOf('\n');
              throw new Error(`typeof operator is not supported yet inside of structOf expression (in ${args.path}:${row}:${column})`);
            }

            return `export type _esDocsEscapedType_${index} = ${expression.value}`;
          })
          .join(';\n');
        const typings = await resolveTypings(args.path, escapedDeclarations + ';\n' + tsEscapedText.toString());
        const expressionsStructs = structOfExpressions.map((_, index) => typings[`_esDocsEscapedType_${index}`]);
        const dependencies = expressionsStructs.map((struct) => struct.dependencies).flat();
        const dependenciesStructs = Object.fromEntries(
          dependencies.map((typeName, index) => {
            if (!typings[typeName]) {
              throw new Error(`Unable to find ${typeName} declaration from ${args.path}`);
            }

            return [`_esDocsEscapedType_${index}`, typings[typeName]];
          })
        );

        const typingsPrepand = `const structOf = (typeName) => { return ${JSON.stringify(dependenciesStructs)}[typeName];};`;
        prepand += typingsPrepand;
      }

      const { value: contents } = await compileMdx(tsEscapedText, {
        remarkPlugins: [getArticlesHandler(args.path, traverseCollections)],
      });

      const config = getConfiguration(args.path);
      if (Object.keys(config.globals).length > 0) {
        const globalsPrepand =
          Object.entries(config.globals)
            .map(([varName, varValue]) => `var ${varName} = ${JSON.stringify(varValue)}`)
            .join(';\n') + ';\n';
        prepand += globalsPrepand;
      }

      const { layout } = config.viewsSetup;
      const exportExpression = `export const __esDocsArticleView = MDXContent;export const __esDocsArticleSetup = ${JSON.stringify({ layout })};`;

      return {
        contents: prepand + ';\n' + contents + ';\n' + exportExpression,
        loader: 'tsx',
      };
    });
  },
});

export const esDocsViewGlobalsAlias: EsBuildPlugin = {
  name: 'esdocs-esbuild-view-globals-alias',
  setup: (build) => {
    build.onResolve({ filter: /^esdocs$/ }, async () => {
      const dirname = import.meta.url ? esDocsFs.resolveDirname(fileURLToPath(import.meta.url)) : __dirname;

      return {
        path: esDocsFs.resolvePath(dirname, '../../view/global/global.js'),
      };
    });
  },
};
