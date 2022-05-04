import './playground.css';

import cx from 'classnames';
import copyToClipboard from 'copy-to-clipboard';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import usePromise from 'react-use-await';

import { CodeViewer } from '../code/codeViewer';
import { LoggerCounter } from '../logger/Counter';
import { LoggerView } from '../logger/loggerView';
import { CodeEntry, loadPlayground, Playground } from '../utils/loadPlayground';
import { SandboxCss } from '../utils/SandboxCss';
import { PlaygroundRuntime } from './runtime/runtime';

export const PlaygroundView: React.FC<{
  playgroundId: string;
}> = ({ playgroundId }) => {
  const { playground, initRuntime } = usePromise(loadPlayground, [playgroundId]);

  const [consoleVisible, setConsoleVisible] = React.useState(false);
  const [visibleCodeEntry, setVisibleCodeEntry] = React.useState<CodeEntry | null>(null);
  const toggleConsole = React.useCallback(() => setConsoleVisible((x) => !x), [setConsoleVisible]);
  const getSourceCodeToggler = React.useCallback((codeEntry: CodeEntry) => () => setVisibleCodeEntry((prevCodeEntry) => (prevCodeEntry === codeEntry ? null : codeEntry)), []);
  const copyCodeToClipboard = React.useCallback(() => visibleCodeEntry && copyToClipboard(visibleCodeEntry.sourceCode), [visibleCodeEntry?.sourceCode]);

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
            <SandboxCss>
              <PlaygroundRuntime initRuntime={initRuntime} />
            </SandboxCss>
          </ErrorBoundary>
        </React.Suspense>
      </div>
      <div className="es-docs__playground-controls">
        <button onClick={toggleConsole} className="es-docs__playground-control-button">
          Console [<LoggerCounter loggerId={playgroundId} />]
        </button>
        {playground.codeEntries.map((codeEntry) => (
          <button
            key={codeEntry.path}
            onClick={getSourceCodeToggler(codeEntry)}
            className={cx('es-docs__playground-control-file', visibleCodeEntry === codeEntry && 'es-docs__playground-control-file-checked')}
          >
            {codeEntry.name ?? `.${codeEntry.extention.source}`}
          </button>
        ))}
        <button onClick={copyCodeToClipboard} className="es-docs__playground-control-button">
          Copy code
        </button>
      </div>
      {visibleCodeEntry && (
        <div className="es-docs__playground-sources">
          <CodeViewer language={visibleCodeEntry.extention.source} sourceCode={visibleCodeEntry.sourceCode} />
        </div>
      )}
      {consoleVisible && (
        <div className="es-docs__playground-console">
          <LoggerView loggerId={playgroundId} />
        </div>
      )}
    </div>
  );
};
