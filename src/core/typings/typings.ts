import { sep } from 'path';
import ts from 'typescript';

import { serializeInterfaceDeclaration } from './interfaces';
import { serializeTypeDeclaration } from './typeAliases';

const serializeFileDeclaration = (fileDeclaration: ts.SourceFile, filepath: string) => {
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

export const resolveTypings = async (filePath: string, fileContent: string) => {
  const sourceFile = await ts.createSourceFile(filePath.split(sep).pop()!, fileContent, ts.ScriptTarget.Latest);

  const serialized = serializeFileDeclaration(sourceFile, filePath);
  const typings: { [typeName: string]: typeof serialized['types'][0] | typeof serialized['interfaces'][0] } = {};

  for (const typing of [...serialized.types, ...serialized.interfaces]) {
    typings[typing.name] = typing;
  }

  return typings;
};
