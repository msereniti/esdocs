import { uniqueId } from '../../core/utils/uniqueId';

export type EvaluationContext = {
  [evaluationVariable: string]: any;
};

declare global {
  // eslint-disable-next-line no-var
  var ____esDocs____evaluationContextContainer: {
    [evaluationId: string]: EvaluationContext;
  };
}

export const evaluateWithContext = (
  toEvaluate: string,
  context: EvaluationContext
) => {
  const evaluationId = uniqueId('evaluation');

  globalThis.____esDocs____evaluationContextContainer =
    globalThis.____esDocs____evaluationContextContainer || {};

  globalThis.____esDocs____evaluationContextContainer[evaluationId] = context;

  const contextNamesJoin = Object.keys(context).join(', ');

  const code = `const { ${contextNamesJoin} } = globalThis.____esDocs____evaluationContextContainer["${evaluationId}"];\n\n${toEvaluate}`;

  /**
   * Eval is used instead of new Function cause eval returns last evaluated expression
   */
  // https://esbuild.github.io/content-types/#direct-eval
  // eslint-disable-next-line no-eval
  const evalGlobalScopeCall = eval;

  const result = evalGlobalScopeCall(code);

  delete globalThis.____esDocs____evaluationContextContainer[evaluationId];

  return result;
  // return new Function(contextVar, code)(context);
};
