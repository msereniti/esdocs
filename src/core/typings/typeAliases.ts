import ts from 'typescript';

import { extractDependenciesList, SerializedNode, serializeProperty, serializeTsNode } from './serializer';
import { SerializedType } from './typings';

export const serializeTypeDeclaration = (typeDeclaration: ts.TypeAliasDeclaration): SerializedType => {
  const name = typeDeclaration.name.escapedText as string;
  const genericsMap: Record<string, SerializedNode> = {};
  const properties = [];
  const dependencies: string[] = [];

  for (const typeParameter of typeDeclaration.typeParameters ?? []) {
    if (typeParameter.kind === ts.SyntaxKind.TypeParameter && typeParameter.constraint) {
      const computedNode = serializeTsNode(typeParameter.constraint, genericsMap);

      dependencies.push(...extractDependenciesList(computedNode));
      const { escapedText } = typeParameter.name as { escapedText: string };

      genericsMap[escapedText] = computedNode;
    }
  }
  if (typeDeclaration.type.kind === ts.SyntaxKind.TypeLiteral) {
    const { members } = typeDeclaration.type as ts.TypeLiteralNode;

    properties.push(
      ...members.filter((property) => property.kind === ts.SyntaxKind.PropertySignature).map((property) => serializeProperty(property as ts.PropertySignature, genericsMap))
    );
  }
  for (const property of properties) {
    dependencies.push(...property.dependencies);
  }

  const type: string[] = serializeTsNode(typeDeclaration.type, genericsMap);

  dependencies.push(...extractDependenciesList(type));

  return {
    entity: 'type',
    name,
    type,
    properties,
    dependencies,
  };
};
