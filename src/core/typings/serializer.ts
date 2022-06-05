import ts from 'typescript';

export type SerializedNode =
  | {
      referenceTo: string;
      displayText: string;
    }
  | string
  | string[]
  | SerializedNode[];

export type SerializedProperty = {
  name: string;
  isOptional: boolean;
  type: string[];
  description: string;
  params: Record<string, string>;
  dependencies: string[];
};

export const extractDependenciesList = (typingsParts: SerializedNode[]) => {
  const dependencies = typingsParts.filter((part) => typeof part === 'object').map((part) => (part as { referenceTo: string }).referenceTo);

  for (let i = 0; i < dependencies.length; i++) {
    if (!dependencies[i]) {
      throw new Error(`Got invalid dependency while resolving dependencies of ${JSON.stringify(typingsParts)}`);
    }
  }

  return dependencies;
};
const computeTypingStringLength = (typingsParts: SerializedNode[]) =>
  typingsParts.reduce((sum, part) => sum + (typeof part === 'string' ? part.length : (part as { displayText: string }).displayText.length), 0);

export const serializeTsNode = (node: ts.Node, genericsMap: Record<string, SerializedNode> = {}) => {
  const traverse = (node: ts.Node): SerializedNode => {
    switch (node.kind) {
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.ObjectKeyword:
        return 'object';
      case ts.SyntaxKind.SetKeyword:
        return 'set';
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.SymbolKeyword:
        return 'symbol';
      case ts.SyntaxKind.UndefinedKeyword:
        return 'undefined';
      case ts.SyntaxKind.VoidKeyword:
        return 'void';
      case ts.SyntaxKind.NeverKeyword:
        return 'never';
      case ts.SyntaxKind.NullKeyword:
        return 'null';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      case ts.SyntaxKind.TrueKeyword:
        return 'true';
      case ts.SyntaxKind.FalseKeyword:
        return 'false';
      case ts.SyntaxKind.BigIntKeyword:
        return 'BigInt';
      case ts.SyntaxKind.AnyKeyword:
        return 'any';
      case ts.SyntaxKind.UnknownKeyword:
        return 'unknown';
      case ts.SyntaxKind.StringLiteral:
        return `"${(node as ts.StringLiteral).text}"`;
      case ts.SyntaxKind.FirstLiteralToken:
        return (node as ts.LiteralLikeNode).text;
      case ts.SyntaxKind.Identifier:
        return (node as ts.Identifier).escapedText as string;
      case ts.SyntaxKind.TypeParameter:
        return (node as ts.TypeParameterDeclaration).name.escapedText as string;
      case ts.SyntaxKind.InferType:
        return [`infer `, traverse((node as ts.InferTypeNode).typeParameter)];
      case ts.SyntaxKind.TypeQuery:
        // console.log(node);

        return [`typeof `, traverse((node as ts.TypeQueryNode).exprName)];
      case ts.SyntaxKind.ArrayType:
        return [traverse((node as ts.ArrayTypeNode).elementType), '[]'];
      case ts.SyntaxKind.RestType:
        return ['...', traverse((node as ts.RestTypeNode).type)];
      case ts.SyntaxKind.TypeLiteral:
        const members = (node as ts.TypeLiteralNode).members.map((member) => traverse(member));

        return ['{', members, '}'];
      case ts.SyntaxKind.TupleType:
        return ['[', (node as ts.TupleTypeNode).elements.map((element) => traverse(element)), ']'];
      case ts.SyntaxKind.PropertySignature: {
        const signature = serializeProperty(node as ts.PropertySignature, genericsMap);
        const result = [signature.name];

        if (signature.isOptional) {
          result.push('?');
        }
        result.push(': ');
        result.push(...signature.type);

        return result;
      }
      case ts.SyntaxKind.ParenthesizedType:
        return ['(', traverse((node as ts.ParenthesizedTypeNode).type), ')'];
      case ts.SyntaxKind.FunctionType: {
        const { parameters, type } = node as ts.FunctionTypeNode;
        const params = parameters.map((param) => traverse(param));
        const returnType = traverse(type);
        const result = [];

        result.push('(');
        for (let i = 0; i < params.length; i++) {
          if (i !== 0) result.push(', ');
          result.push(params[i]);
        }
        result.push(') => ');
        result.push(returnType);

        return result;
      }
      case ts.SyntaxKind.ConditionalType:
        const { checkType, extendsType, trueType, falseType } = node as ts.ConditionalTypeNode;

        return [traverse(checkType), ' extends ', traverse(extendsType), ' ? ', traverse(trueType), ' : ', traverse(falseType)];
      case ts.SyntaxKind.MappedType: {
        const { typeParameter, type } = node as ts.MappedTypeNode;

        return ['[', traverse(typeParameter.name), traverse(typeParameter.constraint!), ']:', traverse(type!)];
      }
      case ts.SyntaxKind.IndexSignature: {
        const { type, parameters } = node as ts.IndexSignatureDeclaration;

        if (parameters.length !== 1) {
          // eslint-disable-next-line no-console
          console.error(node);
          throw new Error(`Unable to handle IndexSignature with node.paraments.length !== 1`);
        }

        return ['[', traverse(parameters[0]), ']:', traverse(type)];
      }
      case ts.SyntaxKind.NamedTupleMember:
      case ts.SyntaxKind.Parameter: {
        const { name, type } = node as ts.ParameterPropertyDeclaration;
        const parameterName = name.escapedText;
        const parameterValue = type ? traverse(type) : '';

        if (parameterValue) {
          return [parameterName as string, ': ', parameterValue];
        } else {
          return [parameterName as string];
        }
      }
      case ts.SyntaxKind.IndexedAccessType:
        const { objectType, indexType } = node as ts.IndexedAccessTypeNode;

        return [traverse(objectType), '[', traverse(indexType), ']'];
      case ts.SyntaxKind.UnionType: {
        const { types } = node as ts.UnionTypeNode;
        const result = [];

        for (let i = 0; i < types.length; i++) {
          if (i !== 0) result.push(' | ');
          result.push(traverse(types[i]));
        }

        return result;
      }
      case ts.SyntaxKind.IntersectionType: {
        const { types } = node as ts.IntersectionTypeNode;
        const result = [];

        for (let i = 0; i < types.length; i++) {
          if (i !== 0) result.push(' & ');
          result.push(traverse(types[i]));
        }

        return result;
      }
      case ts.SyntaxKind.FirstJSDocNode:
        return traverse((node as ts.JSDocTypeReferencingNode).type);
      case ts.SyntaxKind.LiteralType:
        return traverse((node as ts.LiteralTypeNode).literal);
      case ts.SyntaxKind.TypeOperator: {
        const { type, operator } = node as ts.TypeOperatorNode;

        switch (operator) {
          case ts.SyntaxKind.KeyOfKeyword:
            return ['keyof ', traverse(type)];
        }
        throw new Error(`Got unknown type operator ${ts.SyntaxKind[operator]} (${operator})`);
      }
      case ts.SyntaxKind.TemplateLiteralType:
        const { head, templateSpans } = node as ts.TemplateLiteralTypeNode;

        return ['`', head.text, templateSpans.map((span) => traverse(span)), '`'];
      case ts.SyntaxKind.TemplateLiteralTypeSpan:
        const { type, literal } = node as ts.TemplateLiteralTypeSpan;

        return ['${', traverse(type), '}', literal.text];
      case ts.SyntaxKind.TypeReference:
        const { typeName, typeArguments } = node as Omit<ts.TypeReferenceNode, 'typeName'> & {
          typeName: ts.BinaryExpression & { escapedText: string };
        };

        if (typeName.left && typeName.right) {
          return [traverse(typeName.left), '.', traverse(typeName.right)];
        }
        if (typeArguments) {
          return [typeName.escapedText, '<', typeArguments.map((arg) => traverse(arg)), '>'];
        }
        if (typeName.escapedText !== undefined) {
          const genericReference = genericsMap[typeName.escapedText];

          if (genericReference) return genericReference;

          return {
            referenceTo: typeName.escapedText,
            displayText: typeName.escapedText,
          };
        }

        break;
    }

    // eslint-disable-next-line no-console
    console.error(node);
    throw new Error(`Unable to handle ${ts.SyntaxKind[node.kind]}`);
  };

  const nestedList = [traverse(node)];
  const flatList = nestedList.flat(Infinity);
  const joinedList = flatList.reduce((acc, item) => {
    if (typeof item === 'string' && typeof acc[acc.length - 1] === 'string') {
      acc[acc.length - 1] += item;
    } else {
      acc.push(item);
    }

    return acc;
  }, []);

  return joinedList;
};

export const serializeProperty = (propertyDeclaration: ts.PropertySignature, genericsMap: Record<string, SerializedNode>): SerializedProperty => {
  const name = (propertyDeclaration as { name: ts.Identifier }).name.escapedText as string;
  const isOptional = propertyDeclaration.questionToken !== undefined;
  const type = serializeTsNode(propertyDeclaration.type!, genericsMap);
  const dependencies = extractDependenciesList(type);

  const jsDoc = (propertyDeclaration as { jsDoc?: ts.JSDoc[] }).jsDoc ?? [];
  const params = Object.fromEntries(
    jsDoc
      .map((jsDocBlock) => jsDocBlock.tags ?? [])
      .flat()
      .map((tag) => {
        const paramName = tag.tagName.escapedText;
        const { typeExpression } = tag as ts.JSDocTypeTag;
        const paramValue = typeExpression && serializeTsNode(typeExpression, genericsMap);

        if (paramName === 'use') {
          const useInstead = (tag.comment as string).split('.')[0];
          let useInsteadPostfix = (tag.comment as string).split('.').slice(1).join('.');

          if (useInsteadPostfix.length > 0) {
            useInsteadPostfix = '.' + useInsteadPostfix;
          }
          dependencies.push(useInstead);

          return [paramName, [{ referenceTo: useInstead, displayText: useInstead }, useInsteadPostfix]];
        }

        if (!paramValue || computeTypingStringLength(paramValue) === 0) {
          return [paramName, tag.comment];
        }
        dependencies.push(...extractDependenciesList(paramValue));

        return [paramName, paramValue];
      })
  );
  const description = params.description ?? jsDoc.map((jsDocBlock) => jsDocBlock.comment).join('\n');

  return {
    name,
    isOptional,
    type,
    description,
    params,
    dependencies,
  };
};
