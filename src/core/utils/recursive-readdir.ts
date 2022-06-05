import { sep } from 'path';

import { esDocsFs } from './fs';

type Filter = {
  startsWith?: string | string[];
  endsWith?: string | string[];
  includes?: string | string[];
};
type FSPath = string;

export const recursiveReadDir = async (rootDir: string, filter?: Filter, maxDepth = Infinity): Promise<FSPath[]> => {
  if (!(await esDocsFs.exists(esDocsFs.resolvePath(rootDir)))) return [];

  const result: FSPath[] = [];
  const resolvedTasks = new Map<FSPath, true>();
  let tasks: { path: FSPath; work: Promise<void> }[] = [];

  const createTask = (path: FSPath, depth = 1) => ({
    path,
    work: (async () => {
      const names = await esDocsFs.readDir(path);
      const entities = names.map((name) => ({
        path: esDocsFs.resolvePath(path, name),
        name,
      }));

      if (rootDir === '.') {
        console.info(entities);
        process.exit();
      }

      const stats = await Promise.all(entities.map(({ path }) => esDocsFs.stat(path)));

      const files = entities
        .filter((_, index) => stats[index].isFile())
        .filter(({ name }) => {
          if (!filter) return true;

          for (const key in filter) {
            const filterFunc = key as keyof Filter;
            const filterValue = filter[filterFunc];

            if (Array.isArray(filterValue)) {
              if (!filterValue.some((value) => name[filterFunc](value))) {
                return false;
              }
            } else if (!name[filterFunc](filterValue as string)) {
              return false;
            }
          }

          return true;
        });
      const dirs = entities.filter((_, index) => stats[index].isDirectory());

      result.push(...files.map(({ path }) => path));

      if (depth < maxDepth) {
        tasks.push(...dirs.map(({ path }) => createTask(path, depth + 1)));
      }

      resolvedTasks.set(path, true);
    })(),
  });

  tasks.push(createTask(esDocsFs.resolvePath(rootDir)));

  while (tasks.length > 0) {
    await Promise.all(tasks.map((task) => task.work));

    tasks = tasks.filter((task) => !resolvedTasks.has(task.path));
  }

  return result.sort((a, b) => a.localeCompare(b)).sort((a, b) => a.split(sep).length - b.split(sep).length);
};
