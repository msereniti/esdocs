import { sep } from 'path';

import { EsDocsBundlerIntegration, EsDocsBundlerIntegrationParams, EsDocsBundlerIntegrationResult, outOfTheBoxBundlers } from '../../integrations/bundlers/bunders';
import { getAllConfigurations, getConfiguration, getRootConfiguration } from '../configuration/configuration';
import { esDocsFs } from '../utils/fs';

export const runBundler = async (params: EsDocsBundlerIntegrationParams): Promise<EsDocsBundlerIntegrationResult> => {
  const defaultBundler = getRootConfiguration().bundler;
  const configurations = getAllConfigurations();
  const bundlerDirectories: { [directory: string]: string | EsDocsBundlerIntegration } = { '/': defaultBundler };
  for (const config of configurations) {
    const bundler = config?.contents.bundler;
    if (bundler) {
      bundlerDirectories[esDocsFs.resolveDirname(config.path)] = bundler;
    }
  }
  const entryPointsByBundler = new Map<string | EsDocsBundlerIntegration, EsDocsBundlerIntegrationParams['entryPoints']>();
  for (const entryPoint in params.entryPoints) {
    const dirname = esDocsFs.resolveDirname(params.entryPoints[entryPoint]);
    const parts = dirname.split(sep);
    let bundler: string | EsDocsBundlerIntegration | null = null;
    for (let i = parts.length; i > 0; i--) {
      bundler = bundlerDirectories[parts.slice(0, i).join(sep)];

      if (bundler) break;
    }
    if (!bundler) {
      throw new Error(`Unable to determine bundler for ${params.entryPoints[entryPoint]}`);
    }
    entryPointsByBundler.set(bundler, entryPointsByBundler.get(bundler) || {});
    entryPointsByBundler.get(bundler)![entryPoint] = params.entryPoints[entryPoint];
  }

  const availableBundlers: { [bundlerName: string]: EsDocsBundlerIntegration } = { ...outOfTheBoxBundlers };
  for (const config of configurations) {
    for (const bundlerName in config?.contents.bundlers || {}) {
      availableBundlers[bundlerName] = (config?.contents.bundlers || {})[bundlerName];
    }
  }

  const bundlingTasks: Promise<EsDocsBundlerIntegrationResult>[] = [];

  for (let bundler of entryPointsByBundler.keys()) {
    const entryPoints = entryPointsByBundler.get(bundler)!;
    const bundlerName = String(bundler);

    if (typeof bundler === 'string') {
      bundler = availableBundlers[bundler as keyof typeof availableBundlers];
    }

    if (!bundler) {
      throw new Error(`Bundler ${bundlerName} is not configurated`);
    }

    bundlingTasks.push(bundler({ ...params, entryPoints }));
  }

  const bundlingResults = await Promise.all(bundlingTasks);

  return bundlingResults.flat();
};
