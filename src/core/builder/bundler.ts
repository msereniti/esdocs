import {
  EsDocsBundlerIntegrationParams,
  EsDocsBundlerIntegrationResult,
  outOfTheBoxBundlers,
} from '../../integrations/bundlers/bunders';

export const runBundler = async (
  params: EsDocsBundlerIntegrationParams
): Promise<EsDocsBundlerIntegrationResult> => {
  const bundler = outOfTheBoxBundlers.esbuild;

  return await bundler(params);
};
