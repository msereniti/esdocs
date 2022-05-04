import { evaluateWithContext, EvaluationContext } from './evaluateWithContext';
import { loadJsonFile } from './loadJson';
import { loadTextFile } from './loadTextFile';
import { sourceMapsHandler } from './sourceMapsHandler';

export const loadModule = async <Module extends unknown>(
  url: string,
  {
    scopeImports = {},
    requirableModules = {},
  }: {
    scopeImports?: EvaluationContext;
    requirableModules?: EvaluationContext;
    cutIife?: boolean;
  }
) => {
  const module: { exports?: { default?: Module } } = {};

  const context = {
    ...scopeImports,
    require: (moduleName: string) => {
      if (requirableModules[moduleName]) {
        return requirableModules[moduleName];
      } else {
        const errorMessage = `Unable to provide module "${moduleName}" for ${url}, only [` + Object.keys(requirableModules).join(', ') + `] modules available to be required`;

        throw new Error(errorMessage);
      }
    },
    module,
  };

  const moduleCode = await loadTextFile(url);
  const lastLine = moduleCode.split('\n').filter(Boolean).pop();
  // moduleCode = moduleCode.replace('# sourceMappingURL=', 'fuck');

  // if (lastLine?.startsWith('//# esDocsSourceMappingFile=')) {
  //   const moduleUrlDir = url.split('/').slice(0, -1).join('/');
  //   const sourceMapsFileName = lastLine.substring(
  //     '//# esDocsSourceMappingFile='.length
  //   );
  // const sourceMapsUrl = moduleUrlDir + '/' + sourceMapsFileName;

  // const sourceMaps = await loadJsonFile(sourceMapsUrl);

  // if (sourceMaps.version === 3) {
  //   sourceMapsHandler(
  //     sourceMaps.mappings,
  //     sourceMaps.sourcesContent,
  //     moduleCode
  //   );
  // } else {
  //   // eslint-disable-next-line no-console
  //   console.warn(
  //     `Got unsupported source maps version ${sourceMaps.version} in ${sourceMapsUrl}. Currently supported versions: 3.`
  //   );
  // }
  // }

  try {
    return evaluateWithContext(moduleCode, context);
  } catch (error) {
    /** TBD: handle in better way */
    /* eslint-disable no-console */
    console.error(`Error occurred while evaluating module "${url}":`);
    console.error(error);
    /* eslint-enable no-console */
  }
};
