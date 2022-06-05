import fsExtra from 'fs-extra';
import path from 'path';

import { logger } from './logger';

const fsExists = async (path: string) => {
  try {
    await fsExtra.access(path);

    return true;
  } catch {
    return false;
  }
};

const tmpFiles = new Set<string>();
let tmpFsTasks: (
  | {
      type: 'writeFile';
      path: string;
      content: string;
    }
  | {
      type: 'writeJson';
      path: string;
      content: {};
    }
  | {
      type: 'removeFile';
      path: string;
    }
)[] = [];
let outputFsTasks: (
  | {
      type: 'writeFile';
      path: string;
      content: string;
    }
  | {
      type: 'writeJson';
      path: string;
      content: {};
    }
)[] = [];

export const esDocsFs = {
  putTmpFileWrite: (path: string, content: string) => {
    logger.verbose(`Requested tmp file write to ${path}`);
    tmpFsTasks = tmpFsTasks.filter((task) => task.path !== path);
    tmpFsTasks.push({ type: 'writeFile', path, content });
  },
  putTmpJsonWrite: (path: string, content: {}) => {
    logger.verbose(`Requested tmp json file write to ${path}`);
    tmpFsTasks = tmpFsTasks.filter((task) => task.path !== path);
    tmpFsTasks.push({ type: 'writeJson', path, content });
  },
  putTmpFileRemove: (path: string) => {
    logger.verbose(`Requested tmp file remove ${path}`);
    const tasksCountBefore = tmpFsTasks.length;
    tmpFsTasks = tmpFsTasks.filter((task) => task.path !== path);
    if (tasksCountBefore === tmpFsTasks.length) {
      tmpFsTasks.push({ type: 'removeFile', path });
    }
  },
  commitTmps: async () => {
    logger.verbose('Writing tmp files to the disk');
    const tasks = [...tmpFsTasks];
    tmpFsTasks = [];
    const writeDirectories = tasks.filter(({ type }) => type === 'writeFile' || type === 'writeJson').map((task) => path.dirname(task.path));
    await Promise.all([...new Set(writeDirectories)].map((dirPath) => fsExtra.ensureDir(dirPath)));
    await Promise.all(
      tasks.map(async (task) => {
        if (task.type === 'writeFile') {
          if (await fsExists(task.path)) throw new Error(`Unable to overwrite ${task.path} file with tmp file`);
          await fsExtra.writeFile(task.path, task.content);
          tmpFiles.add(task.path);
        } else if (task.type === 'writeJson') {
          if (await fsExists(task.path)) throw new Error(`Unable to overwrite ${task.path} file with tmp file`);
          await fsExtra.writeJson(task.path, task.content);
          tmpFiles.add(task.path);
        } else if (task.type === 'removeFile') {
          if (!(await fsExists(task.path))) throw new Error(`Tmp file ${task.path} was unexpectedly removed between tmp fs commitments`);
          await fsExtra.remove(task.path);
          if ((await fsExtra.readdir(path.dirname(task.path))).length === 0) {
            await fsExtra.remove(path.dirname(task.path));
          }
          tmpFiles.delete(task.path);
        }
      })
    );
  },
  clearTmps: async () => {
    logger.verbose('Clearing tmp files');
    tmpFsTasks = [];
    [...tmpFiles.values()].forEach((path) => esDocsFs.putTmpFileRemove(path));
    await esDocsFs.commitTmps();
  },
  writeOutputFile: (path: string, content: string) => {
    logger.verbose(`Requesting output file write to ${path}`);

    return outputFsTasks.push({ type: 'writeFile', path, content });
  },
  writeOutputJson: (path: string, content: {}) => {
    logger.verbose(`Writing output json file write to ${path}`);

    return outputFsTasks.push({ type: 'writeJson', path, content });
  },
  clearOutputDir: async (outputDir: string) => {
    logger.verbose(`Clearing output directory ${outputDir}`);
    await fsExtra.emptyDir(outputDir);
    await fsExtra.ensureDir(outputDir);
  },
  commitOutputWrites: async (outputDir: string) => {
    logger.verbose(`Writing output files to ${outputDir}`);

    const tasks = [...outputFsTasks];
    outputFsTasks = [];
    const writeDirectories = tasks.map((task) => path.dirname(task.path));
    await Promise.all([...new Set(writeDirectories)].map((dirPath) => fsExtra.ensureDir(dirPath)));
    await Promise.all(
      tasks.map(async (task) => {
        if (!task.path.startsWith(outputDir)) {
          throw new Error(`Unable to commit output file ${task.path} out of output directory ${outputDir}`);
        }
        if (task.type === 'writeFile') {
          await fsExtra.writeFile(task.path, task.content);
        } else if (task.type === 'writeJson') {
          await fsExtra.writeJson(task.path, task.content);
        }
      })
    );
  },
  readJson: fsExtra.readJson,
  readFile: async (path: string) => await fsExtra.readFile(path, 'utf-8'),
  stat: fsExtra.stat,
  exists: fsExists,
  resolvePath: path.resolve,
  resolveDirname: path.dirname,
  resolveRelative: path.relative,
  readDir: fsExtra.readdir,
};
