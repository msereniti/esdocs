import { sep } from 'path';

import { esDocsFs } from '../../utils/fs';
import { makeCommonPath } from '../../utils/makeCommonPath';

export type NavigationNode = {
  children: NavigationNode[];
  label?: string;
  chunk?: string;
  route?: string;
  id?: string;
};
export type NavigationTree = NavigationNode[];

type NavigationIntermediateNode = {
  children: {
    [childrenId: string]: NavigationIntermediateNode;
  };
  order: number;
  label?: string;
  chunk?: string;
  route?: string;
};

const cutRelativePaths = (paths: string[]) => {
  const basePath = (paths.length === 1 ? esDocsFs.resolveDirname(paths[0]) : makeCommonPath(paths)) + sep;

  return {
    basePath,
    relativePaths: paths.map((absolutePath) => absolutePath.substring(basePath.length)),
  };
};

const withoutExtension = (path: string) => path.split('.').slice(0, -1).join('.');

export const buildNavigation = async (
  {
    rawArticles,
    bundledArticles,
    articlesLabelsByPath,
  }: {
    rawArticles: string[];
    bundledArticles: string[];
    articlesLabelsByPath: { [filePath: string]: string };
  },
  destinationPath: string
) => {
  const commonPath = makeCommonPath(rawArticles);
  const intermediateTree: NavigationIntermediateNode = { children: {}, order: 0 };
  for (let pathIndex = 0; pathIndex < rawArticles.length; pathIndex++) {
    const relativePath = esDocsFs.resolveRelative(commonPath, rawArticles[pathIndex]);
    const parts = relativePath.split(sep);
    let node = intermediateTree;
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      const isIndexPart = partIndex === parts.length - 1 && (part.startsWith('index.') || part.startsWith(parts[partIndex - 1] + '.'));

      if (!isIndexPart) {
        if (!node.children[part]) node.children[part] = { children: {}, order: Object.keys(node.children).length, label: part };
        node = node.children[part];
      }
    }
    node.label = articlesLabelsByPath[rawArticles[pathIndex]];
    node.chunk = bundledArticles[pathIndex];
    node.route = withoutExtension(relativePath);
  }
  const chunks: Omit<NavigationNode, 'children'>[] = [];
  const treeContainer: NavigationNode = { children: [] };
  let uniqueId = 0;
  const traverseIntermediateTree = (intermediateNode: NavigationIntermediateNode, node: NavigationNode) => {
    for (const childName in intermediateNode.children) {
      const { order, label, chunk, route } = intermediateNode.children[childName];
      const id = `r${uniqueId++}`;
      if (chunk) chunks.push({ chunk, route, id });
      node.children[order] = { children: [], label, chunk, route, id };
      traverseIntermediateTree(intermediateNode.children[childName], node.children[order]);
    }
  };
  if (intermediateTree.chunk) {
    chunks.push({ chunk: intermediateTree.chunk, route: '/', id: `r${uniqueId++}` });
    traverseIntermediateTree(intermediateTree, treeContainer);
  } else {
    traverseIntermediateTree(intermediateTree, treeContainer.children[0]);
  }
  const tree: NavigationTree = treeContainer.children;

  const compressTree = (node: NavigationNode) => {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (!child.chunk && child.children.length > 0 && !child.children.every((subChild) => !subChild.chunk)) {
        node.children.splice(i, 1, ...child.children);
        compressTree(node);
      } else {
        compressTree(child);
      }
    }
  };
  tree.forEach(compressTree);

  const navigationFilePath = esDocsFs.resolvePath(destinationPath, 'tree.json');
  const loadersFilePath = esDocsFs.resolvePath(destinationPath, 'loaders.js');
  const resolveUrlFilePath = esDocsFs.resolvePath(destinationPath, 'resolveUrl.json');

  const chunksPaths = chunks.map(({ chunk }) => chunk!);
  const { basePath, relativePaths } = cutRelativePaths(chunksPaths);
  const importsFile = chunks.map(({ id }, index) => {
    const base = esDocsFs.resolveRelative(esDocsFs.resolveDirname(loadersFilePath), basePath);
    const relativePath = relativePaths[index];

    return `export const ${id} = () => import("${base}/${relativePath}")`;
  });

  const routeToId = Object.fromEntries(chunks.map(({ route, id }) => [route, id]));

  await Promise.all([
    esDocsFs.writeOutputJson(navigationFilePath, tree),
    esDocsFs.writeOutputFile(loadersFilePath, importsFile.join('\n')),
    esDocsFs.writeOutputJson(resolveUrlFilePath, routeToId),
  ]);
};
