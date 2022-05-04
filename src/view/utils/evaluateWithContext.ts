import { uniqueId } from '../../core/utils/uniqueId';

export type EvaluationContext = {
  [evaluationVariable: string]: any;
};

declare global {
  // eslint-disable-next-line no-var
  var ____esDocs____evaluationBridge: {
    [evaluationId: string]: {
      context: EvaluationContext;
      scopeController: {};
    };
  };
}

export const evaluateWithContext = (toEvaluate: string, context: EvaluationContext, scopeVariablesListCallback?: (variableNames: string[]) => void) => {
  const evaluationId = uniqueId('evaluation');

  const scopeVariables = new Set<string | symbol>();
  const scopeVariablesContainer = {};
  const scopeController = new Proxy(scopeVariablesContainer, {
    has: (target, propertyName) => {
      scopeVariables.add(propertyName);

      console.log(scopeVariablesContainer);

      return true;

      return propertyName in target;
    },
    get: (target, propertyName) => {
      // console.log(`get ${String(propertyName)}`);
      scopeVariables.add(propertyName);

      return (propertyName in scopeVariablesContainer ? scopeVariablesContainer : window)[propertyName];
    },
  });

  globalThis.____esDocs____evaluationBridge = globalThis.____esDocs____evaluationBridge || {};
  globalThis.____esDocs____evaluationBridge[evaluationId] = {
    context,
    scopeController,
  };

  const prepands: string[] = [];

  if (Object.keys(context).length > 0) {
    const contextNamesJoin = Object.keys(context).join(', ');

    prepands.push(`const { ${contextNamesJoin} } = globalThis.____esDocs____evaluationBridge["${evaluationId}"].context;`);
  }
  if ('____setUpEsDocsEvalExecutor____' in context) {
    prepands.push(`____setUpEsDocsEvalExecutor____(function() { return eval(arguments[0]); });`);
  }
  const code = prepands.join('\n') + '\n\n' + toEvaluate;
  const scopeControlledCode = `with(globalThis.____esDocs____evaluationBridge["${evaluationId}"].scopeController) { return eval(${JSON.stringify(code)}) }`;
  const executionFunction = new Function(scopeControlledCode);

  // console.log(code);

  // console.log(code);

  // /**
  //  * Eval is used instead of new Function cause eval returns last evaluated expression
  //  */
  // // https://esbuild.github.io/content-types/#direct-eval
  // // eslint-disable-next-line no-eval
  // const evalGlobalScopeCall = eval;

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
    console.log(scopeVariablesContainer);
    delete globalThis.____esDocs____evaluationBridge[evaluationId];
  }
};
