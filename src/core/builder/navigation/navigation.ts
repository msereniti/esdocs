import { writeFile } from 'fs/promises';
import { dirname, relative as resolveRelativePath, sep } from 'path';

import { resolvePath, writeJson } from '../../utils/fs';
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
  const basePath =
    (paths.length === 1 ? dirname(paths[0]) : makeCommonPath(paths)) + sep;

  return {
    basePath,
    relativePaths: paths.map((absolutePath) =>
      absolutePath.substring(basePath.length)
    ),
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
  const usedSiblings = paths
    .map((path) => childrenOf[dirname(path)] || [])
    .flat();

  const parentDirs = [...allPaths].map(dirname);
  const parentDirUsages = parentDirs.reduce(
    (acc, dirPath) => ({ ...acc, [dirPath]: (acc[dirPath] || 0) + 1 }),
    {} as { [dirPath: string]: number }
  );
  const usedParentDirs = Object.entries(parentDirUsages)
    .filter(([, usageCount]) => usageCount > 1)
    .map(([dirPath]) => dirPath);
  const singularUsageParentDirs = Object.fromEntries(
    Object.entries(parentDirUsages)
      .filter(([, usageCount]) => usageCount === 1)
      .map(([dirPath]) => [dirPath, true])
  );

  const usedPaths = [...usedParentDirs, ...usedSiblings].filter(
    (path) => !singularUsageParentDirs[path]
  );
  const usedPathsMap = Object.fromEntries(
    usedPaths.map((path) => [path, true])
  );

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
        for (
          let unusedDirectoryPathEnd = from;
          unusedDirectoryPathEnd < to;
          unusedDirectoryPathEnd++
        ) {
          initPaths.push(parts.slice(0, unusedDirectoryPathEnd + 1).join(sep));
        }

        const collapsedPart = parts.slice(from, to).join('_');

        parts.splice(from, to - from, collapsedPart);

        const collapsedDirectory = parts.slice(0, from + 1).join(sep);

        initPathsByCollapsedPath[collapsedDirectory] =
          initPathsByCollapsedPath[collapsedDirectory] || [];
        initPathsByCollapsedPath[collapsedDirectory].push(...initPaths);
      }

      const collapsedPath = parts.join(sep);

      collapsedPaths[path] = collapsedPath;

      initPathsByCollapsedPath[collapsedPath] =
        initPathsByCollapsedPath[collapsedPath] || [];
      initPathsByCollapsedPath[collapsedPath].push(initPath);
    }
  }

  for (const path in initPathsByCollapsedPath) {
    initPathsByCollapsedPath[path] = [
      ...new Set(initPathsByCollapsedPath[path]),
    ];
  }

  return {
    allProcessedPaths: paths.map((path) => collapsedPaths[path] || path),
    untouchedPaths: paths.filter((path) => !collapsedPaths[path]),
    collapsedPaths: paths
      .filter((path) => collapsedPaths[path])
      .map((path) => collapsedPaths[path]),
    initPaths: initPathsByCollapsedPath,
  };
};
export const findLabel = (
  path: string,
  labledFiles: { [filePath: string]: string },
  usedExtensions: string[] = ['md', 'mdx']
) => {
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
  const children = Object.keys(labledFiles).filter(
    (filePath) =>
      filePath.startsWith(path) && filePath.split(sep).length === depth + 1
  );

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
  const { allProcessedPaths: paths, initPaths } =
    collapseIntermediatePaths(relativePaths);

  const addedNodesPosition: {
    [depth: number]: {
      [id: string]: number;
    };
  } = {};

  const addNodeByPath = (relativePath: string, bundledPath: string) => {
    const parts = relativePath.split(sep);
    let node = tree;

    if (
      parts.length >= 2 &&
      withoutExtension(parts[parts.length - 1]) === parts[parts.length - 2]
    ) {
      parts.pop();
    }
    if (
      parts.length >= 2 &&
      withoutExtension(parts[parts.length - 1]) === 'index'
    ) {
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
        let label = findLabel(
          resolvePath(basePath, path),
          labledFiles,
          usedExtensions
        );
        let originalPath = path;

        if (initPaths[path]) {
          for (const possibleInitPath of initPaths[path]) {
            if (label !== undefined) break;
            label = findLabel(
              resolvePath(basePath, possibleInitPath),
              labledFiles,
              usedExtensions
            );
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
  const { tree, chunks } = assembleNavigationTree(
    rawArticles,
    bundledArticles,
    articlesLabelsByPath
  );

  const navigationFilePath = resolvePath(destinationPath, 'tree.json');
  const loadersFilePath = resolvePath(destinationPath, 'loaders.js');
  const resolveUrlFilePath = resolvePath(destinationPath, 'resolveUrl.json');

  const chunksPaths = chunks.map((chunk) => chunk.path);
  const { basePath, relativePaths } = cutRelativePaths(chunksPaths);

  const importsFile = chunks.map(({ id }, index) => {
    const base = resolveRelativePath(dirname(loadersFilePath), basePath);
    const relativePath = relativePaths[index];

    return `export const ${id} = () => import("${base}/${relativePath}")`;
  });

  const urlToId = Object.fromEntries(chunks.map(({ url, id }) => [url, id]));

  await Promise.all([
    writeJson(navigationFilePath, tree),
    writeFile(loadersFilePath, importsFile.join('\n')),
    writeJson(resolveUrlFilePath, urlToId),
  ]);
};
// const articles = await recursiveReadDir(articlesDestPath, {
//   endsWith: '.js',
// });{
// const articles = await recursiveReadDir(articlesDestPath, {
//   endsWith: '.js',
// });

// const { tree, chunks } = assembleNavigationTree(art)

// const navigationTree = buildNavigationTree(articles);
// console.log([...directories]);

// const articlesLabelsByRelativePath =
//   normalizeRelativePathsMap(articlesLabelsByPath);

// const chunksForImport: {
//   path: string;
//   name: string;
// }[] = [];

// const getArticleNavigation = (filePath: string): NavigationNode => {
//   const relativePath = filePath.substring(articlesCommonPath.length);
//   const label = articlesLabelsByRelativePath[withoutExtension(relativePath)];
//   const articleParentDir = parentDir(filePath);
//   const depth = filePath.split(sep).length;
//   /* TBD: add paths indexation and speed up from O(n^2) to O(n)  */
//   const children = articles.filter(
//     (filePath) =>
//       filePath.startsWith(articleParentDir) &&
//       filePath.split(sep).length === depth + 1
//   );

//   const id = withoutExtension(filePath.substring(articlesDestPath.length))
//     .split(/\W/)
//     .join('_');

//   chunksForImport.push({
//     name: id,
//     path: relativePath,
//   });

//   return {
//     label,
//     id,
//     children: children.map(getArticleNavigation),
//   };
// };

// const rootArticles = getRootFiles(articles);
// const navigationFile = rootArticles.map(getArticleNavigation);
// const importsFile = chunksForImport
//   .map(
//     ({ name, path }) =>
//       `export const ${name} = () => import("../../articles/${path}");`
//   )
//   .join('\n');

// await Promise.all([
//   writeJson(resolvePath(destinationPath, 'tree.json'), navigationFile, {
//     spaces: 2,
//   }),
//   writeFile(resolvePath(destinationPath, 'loaders.js'), importsFile),
// ]);

// export const buildNavigationTree = (filePaths: string[]): NavigationNode[] => {

// }

// const normalizeRelativePathsMap = (
//   absolutePathsMap: Record<string, string>
// ) => {
//   const paths = Object.keys(absolutePathsMap);
//   const commonPath = makeCommonPath(paths);

//   const relativePathsMap: Record<string, string> = {};

//   for (const absolutePath in absolutePathsMap) {
//     const relativePath = absolutePath.substring(commonPath.length);
//     const relativePathWithoutExtension = withoutExtension(relativePath);

//     relativePathsMap[relativePathWithoutExtension] =
//       absolutePathsMap[absolutePath];
//   }

//   return relativePathsMap;
// };

// const getRootFiles = (paths: string[]) => {
//   const rootDepth = Math.min(
//     ...paths.map((filePath) => filePath.split(sep).length)
//   );

//   return paths.filter((filePath) => filePath.split(sep).length === rootDepth);
// };

// const getPathsRootDir = (paths: string[]) => {
//   if (paths.length === 1) {
//     return dirname(paths[0]) + sep;
//   }

//   return makeCommonPath(paths) + sep;
// };

// const trimWith = (src: string, toRemove: string) => {
//   let trimStartIndex = 0;
//   let trimEndIndex = src.length;

//   while (src[trimStartIndex] === toRemove) trimStartIndex++;
//   while (src[trimEndIndex - 1] === toRemove) trimEndIndex--;

//   return src.substring(trimStartIndex, trimEndIndex);
// };

// export const buildNavigationTree = (filePaths: string[]): NavigationNode[] => {
//   const filesRootPath = getPathsRootDir(filePaths);
//   const filesRootDepth = filesRootPath.split(sep).length;
//   const maxDepth = Math.max(
//     ...filePaths.map((filePath) => filePath.split(sep).length)
//   );
//   const paths = [...filePaths];

//   const checkedPaths = new Set();
//   let directoriesPaths: string[] = [filesRootPath];
//   const toCheckParentDirs = [...filePaths];

//   while (toCheckParentDirs.length) {
//     const path = toCheckParentDirs.pop()!;
//     const depth = path.split(sep).length;

//     if (depth <= filesRootDepth) continue;
//     if (checkedPaths.has(path)) continue;

//     const parentDir = dirname(path);

//     if (checkedPaths.has(parentDir)) continue;

//     directoriesPaths.push(parentDir);
//     checkedPaths.add(parentDir);
//     checkedPaths.add(path);
//   }

//   directoriesPaths = directoriesPaths.filter(
//     (dirPath) =>
//       filePaths.filter((filePath) => filePath.startsWith(dirPath)).length > 1
//   );

//   console.log(directoriesPaths);

//   paths.push(...directoriesPaths);

//   paths.sort((a, b) => a.localeCompare(b));

//   const filesMap = new Map();
//   const directoriesMap = new Map();

//   for (const filePath of filePaths) filesMap.set(filePath, true);
//   for (const directoryPath of directoriesPaths)
//     directoriesMap.set(directoryPath, true);

//   const buildNavigationNode = (
//     dirPath: string,
//     providedDepth: number
//   ): NavigationNode[] => {
//     let depth = providedDepth;
//     let childrenPaths: string[] = [];

//     while (depth <= maxDepth) {
//       childrenPaths = paths.filter(
//         // eslint-disable-next-line no-loop-func
//         (path) => path.startsWith(dirPath) && path.split(sep).length === depth
//       );

//       if (childrenPaths.length > 0) {
//         break;
//       }

//       depth++;
//     }
//     const byNames = childrenPaths.reduce((acc, path) => {
//       const name = withoutExtension(path.split(sep).pop()!);
//       const isFile = filesMap.has(path);
//       const type: 'file' | 'directory' = isFile ? 'file' : 'directory';

//       return { ...acc, [name]: [...(acc[name] || []), { path, type }] };
//     }, {} as { [name: string]: { path: string; type: 'file' | 'directory' }[] });
//     const isSiblingAnnotation: { [path: string]: true } = {};

//     for (const name in byNames) {
//       const directories = byNames[name].filter(
//         ({ type }) => type === 'directory'
//       );
//       const files = byNames[name].filter(({ type }) => type === 'file');

//       if (directories.length > 0) {
//         files.forEach(({ path }) => (isSiblingAnnotation[path] = true));
//       }
//     }

//     return childrenPaths
//       .filter((path) => !isSiblingAnnotation[path])
//       .map((path) => {
//         const relativePath = path.substring(filesRootPath.length);
//         const name = withoutExtension(path.split(sep).pop()!);
//         const id = withoutExtension(relativePath).split(/\W/).join('_');

//         const siblingAnnotation = byNames[name].find(
//           (sibling) => sibling.type === 'file'
//         );

//         const isFile = filesMap.has(path);

//         const hasArticle = isFile || siblingAnnotation !== undefined; // || hasSameNameAnnotation || hasIndeAnnotation;

//         return {
//           id,
//           label: name,
//           hasArticle,
//           children: isFile ? [] : buildNavigationNode(path, depth + 1),
//         };
//       });
//   };

//   return buildNavigationNode(filesRootPath, filesRootDepth);
// };

// export const buildNavigationTree = (articles: string[]): NavigationNode[] => {
//   const articlesCommonPath = makeCommonPath(articles);

//   const directories = new Set<string>();

//   for (const articlePath of articles) {
//     const parts = articlePath.substring(articlesCommonPath.length).split(sep);

//     for (let i = 0; i < parts.length; i++) {
//       directories.add(
//         resolvePath(articlesCommonPath, parts.slice(0, i).join(sep))
//       );
//     }
//   }

//   type FsNode = {
//     id: string;
//     path: string;
//     type: 'directory' | 'article';
//     name: string;
//   };
//   const childrenOf: {
//     [parentPath: string]: FsNode[];
//   } = {};
//   // const parentOf: { [childrenPath: string]: string } = {};

//   for (const directory of [...directories]) {
//     const parent = directory.split(sep).slice(0, -1).join(sep);
//     const name = directory.split(sep).pop()!;
//     const id = directory
//       .substring(articlesCommonPath.length)
//       .split(/\W/)
//       .join('_');

//     childrenOf[directory] = childrenOf[directory] || [];
//     childrenOf[parent] = childrenOf[parent] || [];

//     childrenOf[parent].push({ path: directory, type: 'directory', name, id });
//     // parentOf[directory] = parent;
//   }
//   for (const article of articles) {
//     const parent = article.split(sep).slice(0, -1).join(sep);
//     const name = withoutExtension(article.split(sep).pop()!);
//     const id = article
//       .substring(articlesCommonPath.length)
//       .split(/\W/)
//       .join('_');

//     childrenOf[parent].push({ path: article, type: 'article', name, id });
//     // parentOf[article] = parent;
//   }

//   // console.log(childrenOf);
//   // const navigationNodes: Record<string, NavigationNode> = {};

//   // const collapseIntermediateNodes = (directory: string) => {
//   //   const parent = parentOf[directory];
//   //   const children = childrenOf[directory];
//   //   const isIntermediate = children.every(
//   //     (child) => child.type === 'directory'
//   //   );

//   //   if (!isIntermediate || !parent) return;

//   //   for (const child of children) {
//   //     parentOf[child.path] = parent;
//   //   }
//   //   childrenOf[parent] = [
//   //     ...childrenOf[parent].filter((child) => child.path !== directory),
//   //     ...children,
//   //   ];

//   //   children.forEach((child) => collapseIntermediateNodes(child.path));
//   // };

//   // for (const directory in childrenOf) {
//   //   collapseIntermediateNodes(directory);
//   // }

//   // for (const directory in childrenOf) {
//   //   const children = childrenOf[directory];
//   //   const articleInChildren = children.some(
//   //     (child) => child.type === 'article'
//   //   );

//   //   if (!articleInChildren) {
//   //     for (let child in children) {
//   //       navigationNodes[child]
//   //     }
//   //   }
//   // }

//   // for (const directory in childrenOf) {
//   //   const children = childrenOf[directory];
//   //   const relativePath = directory.substring(articlesCommonPath.length);

//   //   navigationNodes[directory] = {
//   //     id:
//   //   }
//   // }

//   const rootDirectories = Object.keys(childrenOf).reduce(
//     (rootDirectories, path) => {
//       if (rootDirectories.length === 0) {
//         rootDirectories.push(path);
//       } else {
//         const rootDirectoriesDepth = rootDirectories[0].split(sep).length;
//         const pathDepth = path.split(sep).length;

//         if (pathDepth === rootDirectoriesDepth) {
//           rootDirectories.push(path);
//         } else if (pathDepth < rootDirectoriesDepth) {
//           return [path];
//         }
//       }

//       return rootDirectories;
//     },
//     [] as string[]
//   );

//   const buildNavigationNode = (directory: string): NavigationNode[] => {
//     const children = childrenOf[directory];
//     const articlesCount = children.filter(
//       (child) => child.type === 'article'
//     ).length;

//     if (articlesCount === 0) {
//       return children.map((child) => buildNavigationNode(child.path)).flat(1);
//     }

//     const groupedByNameChildren = Object.values(
//       children.reduce(
//         (acc, child) => ({
//           ...acc,
//           [child.name]: [...(acc[child.name] || []), child],
//         }),
//         {} as { [name: string]: FsNode[] }
//       )
//     );

//     return groupedByNameChildren.map((groupedByNamePair): NavigationNode => {
//       if (
//         groupedByNamePair.length > 2 ||
//         (groupedByNamePair.length === 2 &&
//           groupedByNamePair[0].type === groupedByNamePair[1].type)
//       ) {
//         /** Tbd: more intuitive error */
//         const errorMessage = `Two or more files with different extension name as "${groupedByNamePair[0].name}"`;

//         throw new Error(errorMessage);
//       }
//       const articleChild = groupedByNamePair.find(
//         (child) => child.type === 'article'
//       );
//       const directoryChild = groupedByNamePair.find(
//         (child) => child.type === 'directory'
//       );

//       if (articleChild) {
//         return {
//           id: articleChild.id,
//           label: articleChild.name,
//           hasArticle: true,
//           children: [],
//         };
//       } else {
//         return {
//           id: directoryChild!.id,
//           label: directoryChild!.name,
//           hasArticle: false,
//           children: [],
//         };
//       }
//     }) as any[];
//   };

//   return rootDirectories.map((path) => buildNavigationNode(path)).flat(1);
// };

// export const buildNavigation = async (
//   {
//     articlesDestPath,
//     articlesLabelsByPath,
//   }: {
//     articlesDestPath: string;
//     articlesLabelsByPath: Record<string, string>;
//   },
//   destinationPath: string
// ) => {
//   const articles = await recursiveReadDir(articlesDestPath, {
//     endsWith: '.js',
//   });

//   const navigationTree = buildNavigationTree(articles);
//   // console.log([...directories]);

//   // const articlesLabelsByRelativePath =
//   //   normalizeRelativePathsMap(articlesLabelsByPath);

//   // const chunksForImport: {
//   //   path: string;
//   //   name: string;
//   // }[] = [];

//   // const getArticleNavigation = (filePath: string): NavigationNode => {
//   //   const relativePath = filePath.substring(articlesCommonPath.length);
//   //   const label = articlesLabelsByRelativePath[withoutExtension(relativePath)];
//   //   const articleParentDir = parentDir(filePath);
//   //   const depth = filePath.split(sep).length;
//   //   /* TBD: add paths indexation and speed up from O(n^2) to O(n)  */
//   //   const children = articles.filter(
//   //     (filePath) =>
//   //       filePath.startsWith(articleParentDir) &&
//   //       filePath.split(sep).length === depth + 1
//   //   );

//   //   const id = withoutExtension(filePath.substring(articlesDestPath.length))
//   //     .split(/\W/)
//   //     .join('_');

//   //   chunksForImport.push({
//   //     name: id,
//   //     path: relativePath,
//   //   });

//   //   return {
//   //     label,
//   //     id,
//   //     children: children.map(getArticleNavigation),
//   //   };
//   // };

//   // const rootArticles = getRootFiles(articles);
//   // const navigationFile = rootArticles.map(getArticleNavigation);
//   // const importsFile = chunksForImport
//   //   .map(
//   //     ({ name, path }) =>
//   //       `export const ${name} = () => import("../../articles/${path}");`
//   //   )
//   //   .join('\n');

//   // await Promise.all([
//   //   writeJson(resolvePath(destinationPath, 'tree.json'), navigationFile, {
//   //     spaces: 2,
//   //   }),
//   //   writeFile(resolvePath(destinationPath, 'loaders.js'), importsFile),
//   // ]);
// };
