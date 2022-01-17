import { esbuildIntegration } from './esbuild';

export type ChunkId = string;
export type FilePath = string;
export type EsDocsBundlerIntegrationParams = {
  entryPoints: Record<ChunkId, FilePath>;
  external: string[];
  outputDir: string;
};
export type EsDocsBundlerIntegrationResult = {
  id: ChunkId;
  chunkFilePath: FilePath;
}[];
export type EsDocsBundlerIntegration = (
  params: EsDocsBundlerIntegrationParams
) => Promise<EsDocsBundlerIntegrationResult>;

export const outOfTheBoxBundlers = {
  esbuild: esbuildIntegration,
};
