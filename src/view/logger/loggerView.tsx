import './loggerView.css';

import cx from 'classnames';
import { Console } from 'console-feed';
import Downshift, { DownshiftState, StateChangeOptions, useCombobox } from 'downshift';
import React from 'react';

import { Log, logsApi } from './logger';

export const LoggerView: React.FC<{ loggerId: string }> = ({ loggerId }) => {
  const [logs, setLogs] = React.useState<Log[]>([]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(
    /** TBD: More efficient state update */
    () => logsApi.subscribe(loggerId, (logs) => setLogs(logs)),
    [loggerId]
  );
  React.useEffect(() => {
    containerRef.current?.scrollBy({ top: containerRef.current.scrollHeight });
  }, [logs]);

  /** Virtualization */
  return (
    <div className="es-docs__logger-container" ref={containerRef}>
      <Console logs={logs as any} variant="light" />
      <ExecutorView loggerId={loggerId} />
    </div>
  );
};

const ExecutorView: React.FC<{ loggerId: string }> = ({ loggerId }) => {
  const [executeValue, setExecuteValue] = React.useState('');

  const [suggestedVariables, setSuggestedVariables] = React.useState<string[]>([]);
  const updateSuggestVariables = React.useCallback(
    (filter: string) => {
      const availableVariables = logsApi.getAvailableVariables(loggerId);
      setSuggestedVariables(availableVariables.filter((item) => item !== filter && (!filter || item.toLowerCase().startsWith(filter.toLowerCase()))));
    },
    [setSuggestedVariables]
  );

  const { isOpen, getMenuProps, getInputProps, getComboboxProps, highlightedIndex, getItemProps, openMenu } = useCombobox({
    items: suggestedVariables,
    onInputValueChange: ({ inputValue = '' }) => {
      setExecuteValue(inputValue);
      updateSuggestVariables(inputValue);
    },
    onSelectedItemChange: () => {
      setSuggestedVariables([]);
    },
  });

  const handleFocus = React.useCallback(() => {
    openMenu();
    updateSuggestVariables(executeValue);
  }, [openMenu, loggerId, updateSuggestVariables, executeValue]);

  const handleInputKeydown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!executeValue) return;
      if (event.key !== 'Enter') return;
      if (highlightedIndex !== -1) return;

      logsApi.execute(loggerId, executeValue);
      setExecuteValue('');
      setSuggestedVariables([]);
    },
    [loggerId, executeValue, setExecuteValue, highlightedIndex]
  );

  return (
    <>
      <div className="es-docs__logger_input-container" {...getComboboxProps()}>
        <div className="es-docs__logger_input-prefix">{'>'}</div>
        <input {...getInputProps({ onKeyDown: handleInputKeydown })} onFocus={handleFocus} value={executeValue} className="es-docs__logger_input" />
      </div>
      <ul {...getMenuProps()}>
        {isOpen &&
          suggestedVariables.map((item, index) => (
            <li style={highlightedIndex === index ? { backgroundColor: '#bde4ff' } : {}} key={`${item}${index}`} {...getItemProps({ item, index })}>
              {item}
            </li>
          ))}
      </ul>
    </>
  );
};
