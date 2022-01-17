import { defaultHosts } from '../../integrations/hosts/hosts';
import { resolvePath, writeFile } from '../utils/fs';

export const buildHost = async (destinationPath: string) => {
  const host = defaultHosts.vanilla;

  if (host.staticFiles) {
    const files = Object.keys(host.staticFiles);

    await Promise.all(
      files.map((relativePath) =>
        writeFile(
          resolvePath(destinationPath, relativePath),
          host.staticFiles[relativePath]
        )
      )
    );
  }
};
