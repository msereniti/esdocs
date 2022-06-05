import { sep } from 'path';
import ts, { ImportDeclaration, SourceFile } from 'typescript';

import { esDocsFs } from '../utils/fs';
import { serializeInterfaceDeclaration } from './interfaces';
import { SerializedNode, SerializedProperty } from './serializer';
import { serializeTypeDeclaration } from './typeAliases';

export type SerializedType =
  | {
      entity: 'type';
      name: string;
      type: SerializedNode;
      properties: SerializedProperty[];
      dependencies: string[];
    }
  | {
      entity: 'interface';
      name: string;
      inheritance: SerializedNode;
      properties: SerializedProperty[];
      dependencies: string[];
    };

const serializeFileDeclaration = (fileDeclaration: ts.SourceFile, filepath: string): { filepath: string; types: SerializedType[]; interfaces: SerializedType[] } => {
  const interfaceDec: ts.InterfaceDeclaration[] = [];
  const typesDec: ts.TypeAliasDeclaration[] = [];

  fileDeclaration.forEachChild((child) => {
    if (child.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const isExported = child.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

      if (isExported) {
        interfaceDec.push(child as ts.InterfaceDeclaration);
      }
    }
    if (child.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      const isExported = child.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

      if (isExported) {
        typesDec.push(child as ts.TypeAliasDeclaration);
      }
    }
  });

  const types = typesDec.map((type) => serializeTypeDeclaration(type));
  const interfaces = interfaceDec.map((int) => serializeInterfaceDeclaration(int));

  return {
    filepath,
    types,
    interfaces,
  };
};

const collectImports = async (fileDeclaration: ts.SourceFile, filePath: string) => {
  const paths: string[] = [];

  fileDeclaration.forEachChild((child) => {
    switch (child.kind) {
      case ts.SyntaxKind.ImportClause:
      case ts.SyntaxKind.ImportDeclaration:
      case ts.SyntaxKind.ImportEqualsDeclaration:
      case ts.SyntaxKind.ImportKeyword:
      case ts.SyntaxKind.ImportSpecifier:
      case ts.SyntaxKind.ImportType:
      case ts.SyntaxKind.NamedImports:
      case ts.SyntaxKind.NamespaceImport:
        const declaration = child as ImportDeclaration;
        const moduleSpecifier = declaration?.moduleSpecifier as unknown as SourceFile;
        const path = moduleSpecifier?.text;
        if (path) paths.push(path);
    }
  });

  const fullPaths = paths.filter((path) => path.startsWith('.')).map((relativePath) => esDocsFs.resolvePath(esDocsFs.resolveDirname(filePath), relativePath));
  const extensions = ['ts', 'tsx', 'd.ts'];
  const withExtensions = await Promise.all(
    fullPaths.map(async (path) => {
      for (const extension of extensions) {
        const withExtension = path + '.' + extension;
        if (await esDocsFs.exists(withExtension)) return withExtension;
      }
      throw new Error(`Unable to resolve ${path} from ${filePath}`);
    })
  );

  return withExtensions;
};

export const resolveTypings = async (filePath: string, fileContent: string) => {
  const sourceFile = await ts.createSourceFile(filePath.split(sep).pop()!, fileContent, ts.ScriptTarget.Latest);
  const imports = await collectImports(sourceFile, filePath);
  const importContents = await Promise.all(imports.map((importPath) => esDocsFs.readFile(importPath)));
  const subTypings = await Promise.all(imports.map((importPath, index) => resolveTypings(importPath, importContents[index])));

  const serialized = serializeFileDeclaration(sourceFile, filePath);
  const typings: { [typeName: string]: typeof serialized['types'][0] | typeof serialized['interfaces'][0] } = {};

  for (const subTyping of subTypings) {
    for (const typingName in subTyping) {
      typings[typingName] = subTyping[typingName];
    }
  }
  for (const typing of [...serialized.types, ...serialized.interfaces]) {
    typings[typing.name] = typing;
  }

  return typings;
};
