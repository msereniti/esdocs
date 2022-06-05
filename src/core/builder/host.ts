import { defaultHosts } from '../../integrations/hosts/hosts';
import { getRootConfiguration } from '../configuration/configuration';
import { esDocsFs } from '../utils/fs';

export const setupHost = async (destinationPath: string) => {
  const config = getRootConfiguration();

  esDocsFs.writeOutputJson(esDocsFs.resolvePath(destinationPath, 'devServer.json'), config.devServer);
};

export const buildHost = async (destinationPath: string) => {
  const host = defaultHosts.vanilla;

  if (host.staticFiles) {
    const files = Object.keys(host.staticFiles);

    files.forEach((relativePath) => esDocsFs.writeOutputFile(esDocsFs.resolvePath(destinationPath, relativePath), host.staticFiles[relativePath]));
  }
};
