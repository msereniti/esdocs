import { uniqueId } from '../../core/utils/uniqueId';

export type EvaluationContext = {
  [evaluationVariable: string]: any;
};

export type ExposedContextAccessor = {
  variablesList: string[];
  variablesContainer: Record<string, unknown>;
};

declare global {
  // eslint-disable-next-line no-var
  var ____esDocs____evaluationBridge: {
    [evaluationId: string]: {
      context: EvaluationContext;
      scopeController: {};
      registerScopedVariablesValuesProvider: (variables: string[]) => Record<string, unknown>;
    };
  };
}

export const evaluateWithContext = (toEvaluate: string, context: EvaluationContext, scopeVariablesUpdateCallback?: (exposedVariables: ExposedContextAccessor) => void) => {
  const evaluationId = uniqueId('evaluation');
  let evaluated = false;

  const scopeVariables = new Set<string | symbol>();
  let scopedVariablesProvider: ((variables: string[]) => Record<string, unknown>) | null = null;
  const exposeScopedVariables = () => {
    if (!scopeVariablesUpdateCallback) return;

    const variablesList = [...scopeVariables].map(String).sort((a, b) => {
      if (a.startsWith('_')) return 1;
      if (b.startsWith('_')) return -1;

      return a.localeCompare(b);
    });
    const variablesContainer = scopedVariablesProvider ? scopedVariablesProvider(variablesList) : {};

    scopeVariablesUpdateCallback({ variablesList, variablesContainer });
  };
  const registerScopedVariablesValuesProvider = (provider: typeof scopedVariablesProvider) => (scopedVariablesProvider = provider);
  const handleNewVariables = (variableName: string | symbol) => {
    if (typeof variableName === 'string' && ['globalThis', 'global', 'window', 'eval'].includes(variableName)) return;
    if (typeof variableName === 'string' && variableName.startsWith('____esDocs')) return;

    const knownVariablesBefore = scopeVariables.size;
    scopeVariables.add(variableName);
    if (evaluated && scopeVariables.size !== knownVariablesBefore) {
      exposeScopedVariables();
    }
  };
  const scopeVariablesContainer: Record<string | symbol, unknown> = { ...context };
  const scopeController = new Proxy({} as Record<string | symbol, unknown>, {
    has: (target, propertyName) => {
      handleNewVariables(propertyName);

      return propertyName in target;
    },
    get: (_target, propertyName) => {
      handleNewVariables(propertyName);

      return (propertyName in scopeVariablesContainer ? scopeVariablesContainer : (window as any))[propertyName];
    },
  });

  globalThis.____esDocs____evaluationBridge = globalThis.____esDocs____evaluationBridge || {};
  globalThis.____esDocs____evaluationBridge[evaluationId] = {
    context,
    scopeController,
    registerScopedVariablesValuesProvider,
  } as any;

  const prepands: string[] = [];

  if (Object.keys(context).length > 0) {
    const contextNamesJoin = Object.keys(context)
      .filter((name) => name !== 'globalThis')
      .join(', ');

    prepands.push(`const { ${contextNamesJoin} } = globalThis.____esDocs____evaluationBridge["${evaluationId}"].context;`);
  }

  prepands.push(`globalThis.____esDocs____evaluationBridge["${evaluationId}"].registerScopedVariablesValuesProvider((____esDocs____variablesList) => {
    const ____esDocs____container = {}
    for (const ____esDocs____variableName of ____esDocs____variablesList) {
      ____esDocs____container[____esDocs____variableName] = eval(____esDocs____variableName);
    }
    return ____esDocs____container;
  });`);
  const code = prepands.join('\n') + '\n\n' + toEvaluate;
  const scopeControlledCode = `with(globalThis.____esDocs____evaluationBridge["${evaluationId}"].scopeController) { return eval(${JSON.stringify(code)}) }`;
  const executionFunction = new Function(scopeControlledCode);

  try {
    return executionFunction();
  } catch (error) {
    /* eslint-disable no-console */
    console.groupCollapsed(`Error occurred while evaluating code`);
    console.error(error);
    console.info('Evaluated code:');
    console.info(code);
    console.info('Evaluation context:');
    console.info(context);
    console.groupEnd();
    /* eslint-enable no-console */

    throw error;
  } finally {
    evaluated = true;
    exposeScopedVariables();
    delete globalThis.____esDocs____evaluationBridge[evaluationId];
  }
};
