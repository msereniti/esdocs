import { dirname, relative as resolveRelativePath, sep } from 'path';

import { esDocsFs } from '../../utils/fs';
import { makeCommonPath } from '../../utils/makeCommonPath';
import { withoutExtension } from '../../utils/withoutExtension';

/**
 * I truly suppose that this navigation generated is overengineered.
 * It should be simplified as far as time for that process is available.
 */

type NavigationNode = {
  id: string;
  label: string;
  hasArticle: boolean;
  url: string;
  children: NavigationNode[];
};
type NavigationChunk = {
  id: string;
  url: string;
  path: string;
};

export const cutRelativePaths = (paths: string[]) => {
  const basePath = (paths.length === 1 ? dirname(paths[0]) : makeCommonPath(paths)) + sep;

  return {
    basePath,
    relativePaths: paths.map((absolutePath) => absolutePath.substring(basePath.length)),
  };
};
export const collapseIntermediatePaths = (paths: string[]) => {
  const allPaths = new Set<string>();

  for (const path of paths) {
    const parts = path.split(sep);

    for (let i = 0; i < parts.length; i++) {
      allPaths.add(parts.slice(0, i + 1).join(sep));
    }
  }
  const childrenOf: {
    [parentPath: string]: string[];
  } = {};

  for (const path of [...allPaths]) {
    const parent = dirname(path);

    childrenOf[parent] = childrenOf[parent] || [];

    childrenOf[parent].push(path);
  }
  const usedSiblings = paths.map((path) => childrenOf[dirname(path)] || []).flat();

  const parentDirs = [...allPaths].map(dirname);
  const parentDirUsages = parentDirs.reduce((acc, dirPath) => ({ ...acc, [dirPath]: (acc[dirPath] || 0) + 1 }), {} as { [dirPath: string]: number });
  const usedParentDirs = Object.entries(parentDirUsages)
    .filter(([, usageCount]) => usageCount > 1)
    .map(([dirPath]) => dirPath);
  const singularUsageParentDirs = Object.fromEntries(
    Object.entries(parentDirUsages)
      .filter(([, usageCount]) => usageCount === 1)
      .map(([dirPath]) => [dirPath, true])
  );

  const usedPaths = [...usedParentDirs, ...usedSiblings].filter((path) => !singularUsageParentDirs[path]);
  const usedPathsMap = Object.fromEntries(usedPaths.map((path) => [path, true]));

  const collapsedPaths: { [originalPath: string]: string } = {};
  const initPathsByCollapsedPath: { [collapsedPath: string]: string[] } = {};

  for (const path of paths) {
    const parts = path.split(sep);
    const toCollapse: { from: number; to: number }[] = [];
    let usedFrom = 0;
    let unusedTo = usedFrom + 1;

    while (unusedTo <= parts.length) {
      const path = parts.slice(0, unusedTo).join(sep);

      if (usedPathsMap[path] || unusedTo === parts.length) {
        if (unusedTo - usedFrom > 1) {
          toCollapse.push({ from: usedFrom, to: unusedTo });
        }
        usedFrom = unusedTo;
      }
      unusedTo++;
    }

    const initPath = path;
    const initPaths: string[] = [];

    if (toCollapse.length > 0) {
      for (const { from, to } of [...toCollapse].reverse()) {
        for (let unusedDirectoryPathEnd = from; unusedDirectoryPathEnd < to; unusedDirectoryPathEnd++) {
          initPaths.push(parts.slice(0, unusedDirectoryPathEnd + 1).join(sep));
        }

        const collapsedPart = parts.slice(from, to).join('_');

        parts.splice(from, to - from, collapsedPart);

        const collapsedDirectory = parts.slice(0, from + 1).join(sep);

        initPathsByCollapsedPath[collapsedDirectory] = initPathsByCollapsedPath[collapsedDirectory] || [];
        initPathsByCollapsedPath[collapsedDirectory].push(...initPaths);
      }

      const collapsedPath = parts.join(sep);

      collapsedPaths[path] = collapsedPath;

      initPathsByCollapsedPath[collapsedPath] = initPathsByCollapsedPath[collapsedPath] || [];
      initPathsByCollapsedPath[collapsedPath].push(initPath);
    }
  }

  for (const path in initPathsByCollapsedPath) {
    initPathsByCollapsedPath[path] = [...new Set(initPathsByCollapsedPath[path])];
  }

  return {
    allProcessedPaths: paths.map((path) => collapsedPaths[path] || path),
    untouchedPaths: paths.filter((path) => !collapsedPaths[path]),
    collapsedPaths: paths.filter((path) => collapsedPaths[path]).map((path) => collapsedPaths[path]),
    initPaths: initPathsByCollapsedPath,
  };
};
export const findLabel = (path: string, labledFiles: { [filePath: string]: string }, usedExtensions: string[] = ['md', 'mdx']) => {
  const name = path.split(sep).pop()!;

  if (labledFiles[path]) {
    return labledFiles[path];
  }
  if (labledFiles[withoutExtension(path)]) {
    return labledFiles[withoutExtension(path)];
  }
  for (const extension of usedExtensions) {
    const withExtension = path + '.' + extension;
    const indexFile = path + '/index.' + extension;
    const sameNameChildren = path + '/' + name + '.' + extension;

    if (labledFiles[withExtension]) {
      return labledFiles[withExtension];
    }
    if (labledFiles[indexFile]) {
      return labledFiles[indexFile];
    }
    if (labledFiles[sameNameChildren]) {
      return labledFiles[sameNameChildren];
    }
  }

  const depth = path.split(sep).length;
  const children = Object.keys(labledFiles).filter((filePath) => filePath.startsWith(path) && filePath.split(sep).length === depth + 1);

  if (children.length === 1) {
    const singleChildLabel = labledFiles[children[0]];

    return singleChildLabel;
  }
};
export const assembleNavigationTree = (
  rawPaths: string[],
  bundledPaths: string[],
  labledFiles: { [filePath: string]: string },
  usedExtensions = ['md', 'mdx']
): { tree: NavigationNode; chunks: NavigationChunk[] } => {
  const tree: NavigationNode = {
    id: '[[root]]',
    label: '[[root]]',
    hasArticle: false,
    url: '/',
    children: [],
  };
  const chunks: NavigationChunk[] = [];

  const { basePath, relativePaths } = cutRelativePaths([...rawPaths]);
  const { allProcessedPaths: paths, initPaths } = collapseIntermediatePaths(relativePaths);

  const addedNodesPosition: {
    [depth: number]: {
      [id: string]: number;
    };
  } = {};

  const addNodeByPath = (relativePath: string, bundledPath: string) => {
    const parts = relativePath.split(sep);
    let node = tree;

    if (parts.length >= 2 && withoutExtension(parts[parts.length - 1]) === parts[parts.length - 2]) {
      parts.pop();
    }
    if (parts.length >= 2 && withoutExtension(parts[parts.length - 1]) === 'index') {
      parts.pop();
    }

    for (let depth = 0; depth < parts.length; depth++) {
      const part = withoutExtension(parts[depth]);
      const partOrder = addedNodesPosition[depth]?.[part];

      if (partOrder === undefined) {
        const path = parts.slice(0, depth + 1).join(sep);
        const snakeCasePath = [...parts.slice(0, depth), part].join('_');
        const isLeaf = depth === parts.length - 1;
        const id = snakeCasePath.split(/\W/).join('_');
        let label = findLabel(esDocsFs.resolvePath(basePath, path), labledFiles, usedExtensions);
        let originalPath = path;

        if (initPaths[path]) {
          for (const possibleInitPath of initPaths[path]) {
            if (label !== undefined) break;
            label = findLabel(esDocsFs.resolvePath(basePath, possibleInitPath), labledFiles, usedExtensions);
          }
          originalPath = initPaths[path][initPaths[path].length - 1];
        }

        const url = '/' + withoutExtension(originalPath).split(sep).join('/');

        const newNode: NavigationNode = {
          id,
          label: label || part,
          hasArticle: isLeaf,
          url,
          children: [],
        };

        addedNodesPosition[depth] = addedNodesPosition[depth] || {};
        addedNodesPosition[depth][part] = node.children.length;
        node.children.push(newNode);
        node = newNode;

        if (isLeaf) {
          const newChunk: NavigationChunk = {
            id,
            url,
            path: bundledPath,
          };

          chunks.push(newChunk);
        }
      } else {
        node = node.children[partOrder];
      }
    }
  };

  for (let i = 0; i < paths.length; i++) {
    addNodeByPath(paths[i], bundledPaths[i]);
  }

  return { tree, chunks };
};

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
  const { tree, chunks } = assembleNavigationTree(rawArticles, bundledArticles, articlesLabelsByPath);

  const navigationFilePath = esDocsFs.resolvePath(destinationPath, 'tree.json');
  const loadersFilePath = esDocsFs.resolvePath(destinationPath, 'loaders.js');
  const resolveUrlFilePath = esDocsFs.resolvePath(destinationPath, 'resolveUrl.json');

  const chunksPaths = chunks.map((chunk) => chunk.path);
  const { basePath, relativePaths } = cutRelativePaths(chunksPaths);

  const importsFile = chunks.map(({ id }, index) => {
    const base = resolveRelativePath(dirname(loadersFilePath), basePath);
    const relativePath = relativePaths[index];

    return `export const ${id} = () => import("${base}/${relativePath}")`;
  });

  const urlToId = Object.fromEntries(chunks.map(({ url, id }) => [url, id]));

  await Promise.all([
    esDocsFs.writeOutputJson(navigationFilePath, tree),
    esDocsFs.writeOutputFile(loadersFilePath, importsFile.join('\n')),
    esDocsFs.writeOutputJson(resolveUrlFilePath, urlToId),
  ]);
};
