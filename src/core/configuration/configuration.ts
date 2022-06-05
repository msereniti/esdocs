import ajv, { Schema } from 'ajv';
import glob from 'fast-glob';

import { EsDocsBundlerIntegration } from '../../integrations/bundlers/bunders';
import { EsDocsFrameworkIntegration } from '../../integrations/frameworks/frameworks';
import { mergeDeep } from '../utils/deepMerge';
import { esDocsFs } from '../utils/fs';
import { configurationSchema, rootConfigurationSchema } from './schemas';

export type PortableViewSetup = {
  layout: 'default' | 'full-width' | 'full-screen';
};

export type EsDocsConfiguration = {
  framework?: string | EsDocsFrameworkIntegration;
  frameworks?: {
    [frameworkName: string]: EsDocsFrameworkIntegration;
  };
  bundler?: string | EsDocsBundlerIntegration;
  bundlers?: {
    [bundlerName: string]: EsDocsBundlerIntegration;
  };
  globals?: { [variableName: string]: unknown };
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  viewsSetup?: PortableViewSetup & {};
};
export type EsDocsRootConfiguration = Required<EsDocsConfiguration> & {
  devServer: {
    port: number;
    host: string;
  };
};

const validator = new ajv();
validator.addKeyword({
  validate: (_schema: Schema, data: unknown) => typeof data === 'function',
  keyword: 'function',
  errors: false,
});
validator.addSchema(configurationSchema, 'common');
validator.addSchema(rootConfigurationSchema, 'root');
const defaultRootConfiguration: EsDocsRootConfiguration = {
  framework: 'react',
  frameworks: {},
  bundler: 'esbuild',
  bundlers: {},
  globals: {},
  logLevel: 'warn',
  viewsSetup: {
    layout: 'default',
  },
  devServer: {
    port: 3000,
    host: 'localhost',
  },
};

const validateGlobalsField = (config: EsDocsConfiguration, path: string) => {
  if (!config.globals) return;
  if (Object.keys(config.globals).length === 0) return;
  try {
    JSON.stringify(config.globals);
  } catch {
    throw new Error(`"global" field of ${path} config file is invalid: it should be stringifiable as JSON structure`);
  }
  const traverse = (obj: unknown, path: string[]) => {
    if (!obj) return;
    if (typeof obj === 'object') {
      for (const propertyName in obj) {
        traverse(obj[propertyName as keyof typeof obj], [...path, propertyName]);
      }
    }
    if (typeof obj === 'function' || typeof obj === 'symbol') {
      throw new Error(`"${path.join('.')}" field of ${path} config file is invalid: it should be stringifiable as JSON structure but field type is "${typeof obj}"`);
    }
  };
  traverse(config.globals, ['global']);
};

let configurationInitialized = false;
let rootConfig: { path: string; contents: EsDocsRootConfiguration } | null = null;
let configs: { path: string; contents: EsDocsConfiguration }[] = [];
export const setupConfiguration = async (configurationName = 'esdocs.config', rootDirectory = process.cwd()) => {
  const configFilesSubPaths = await glob(`**/${configurationName}.*`, { cwd: rootDirectory });
  const configFilePaths = configFilesSubPaths.map((subPath) => esDocsFs.resolvePath(rootDirectory, subPath));
  configFilePaths.sort((a, b) => a.length - b.length);
  const configFilesContents = await Promise.all(configFilePaths.map((path) => import(path)));
  configs = configFilePaths.map((path, index) => ({ path, contents: configFilesContents[index].default }));
  rootConfig = { path: esDocsFs.resolvePath(rootDirectory, `default.${configurationName}.json`), contents: defaultRootConfiguration };

  for (const config of configs) {
    if (esDocsFs.resolvePath(esDocsFs.resolveDirname(config.path)) === esDocsFs.resolvePath(rootDirectory)) {
      mergeDeep(rootConfig.contents, config.contents);
      break;
    }
  }

  for (const config of configs) {
    const validationResult = validator.validate('common', config.contents);
    if (!validationResult) {
      throw new Error(validator.errorsText(validator.errors, { dataVar: `Config file ${config.path} <json-root>` }));
    }
    validateGlobalsField(config.contents, config.path);
  }
  {
    const validationResult = validator.validate('root', rootConfig.contents);
    if (!validationResult) {
      throw new Error(validator.errorsText(validator.errors, { dataVar: `Config file ${rootConfig.path} <json-root>` }));
    }
    validateGlobalsField(rootConfig.contents, rootConfig.path);
  }
  configurationInitialized = true;
};

export const getRootConfiguration = () => {
  if (!configurationInitialized) throw new Error(`Configuration is not initialized yet`);

  return rootConfig!.contents;
};
export const getConfiguration = (path: string) => {
  if (!configurationInitialized) throw new Error(`Configuration is not initialized yet`);

  const suitableConfigs = configs.filter((config) => path.startsWith(esDocsFs.resolveDirname(config.path)));
  const config = { ...rootConfig!.contents };
  for (const localConfig of suitableConfigs) {
    mergeDeep(config, localConfig.contents);
  }

  return config;
};
export const getAllConfigurations = () => {
  if (!configurationInitialized) throw new Error(`Configuration is not initialized yet`);

  return [rootConfig, ...configs];
};
