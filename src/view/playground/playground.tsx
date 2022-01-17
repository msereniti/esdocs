import './playground.css';

import copyToClipboard from 'copy-to-clipboard';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { CodeViewer } from '../code/codeViewer';
import { LoggerCounter } from '../logger/Counter';
import { LoggerView } from '../logger/loggerView';
import { PlaygroundRuntime } from './runtime/runtime';

export const Playground: React.FC<{
  playgroundId: string;
  language: string;
  sourceCode: string;
  framework: string;
}> = ({ playgroundId, language, sourceCode, framework }) => {
  const [consoleVisible, setConsoleVisible] = React.useState(false);
  const [sourceCodeVisible, setSourceCodeVisible] = React.useState(false);
  const toggleConsole = React.useCallback(
    () => setConsoleVisible((x) => !x),
    [setConsoleVisible]
  );
  const toggleSourceCode = React.useCallback(
    () => setSourceCodeVisible((x) => !x),
    [setSourceCodeVisible]
  );
  const copyCodeToClipboard = React.useCallback(
    () => copyToClipboard(sourceCode),
    [sourceCode]
  );

  return (
    <div className="es-docs__playground">
      <div className="es-docs__playground-runtime">
        <React.Suspense fallback={'Loading'}>
          <ErrorBoundary
            FallbackComponent={({ error, resetErrorBoundary }) => {
              return (
                <div>
                  <div>Error occured while running playground</div>
                  <div>{error.message}</div>
                  <button onClick={resetErrorBoundary}>Try again</button>
                </div>
              );
            }}
            resetKeys={[playgroundId]}
          >
            <PlaygroundRuntime
              playgroundId={playgroundId}
              framework={framework}
            />
          </ErrorBoundary>
        </React.Suspense>
      </div>
      <div className="es-docs__playground-controls">
        <button
          onClick={toggleConsole}
          className="es-docs__playground-control-button"
        >
          Console [<LoggerCounter loggerId={playgroundId} />]
        </button>
        <button
          onClick={toggleSourceCode}
          className="es-docs__playground-control-button"
        >
          {sourceCodeVisible ? 'Hide' : 'Show'} code
        </button>
        <button
          onClick={copyCodeToClipboard}
          className="es-docs__playground-control-button"
        >
          Copy code
        </button>
        <pre className="es-docs__playground-control-language-label">
          {language}
        </pre>
      </div>
      {consoleVisible && (
        <div className="es-docs__playground-console">
          <LoggerView loggerId={playgroundId} />
        </div>
      )}
      {sourceCodeVisible && (
        <div className="es-docs__playground-sources">
          <CodeViewer language={language} sourceCode={sourceCode} />
        </div>
      )}
    </div>
  );
};
