import type { Message } from 'console-feed/lib/definitions/Console';

import { uniqueId } from '../../core/utils/uniqueId';

type DisposeSubscription = () => void;
type LoggerId = string;
export type Log = Message;
type LogsSubscriber = (logs: Log[]) => void;
type LogsStore = {
  logs: {
    [loggerId: LoggerId]: Log[];
  };
  subscribers: {
    [loggerId: LoggerId]: LogsSubscriber[];
  };
  contextExecutors: {
    [loggerId: LoggerId]: { executor: (toEval: string) => void; availableVariables: string[] };
  };
};
type LogsApi = {
  subscribe: (loggerId: LoggerId, subscriber: LogsSubscriber) => DisposeSubscription;
  publishChanges: (loggerId: LoggerId) => void;

  registerContextExecutor: (loggerId: LoggerId, executor: (toEval: string) => void, availableVariables: string[]) => void;
  execute: (loggerId: LoggerId, toEval: string) => void;
  getAvailableVariables: (loggerId: LoggerId) => string[];
};

const logsStore: LogsStore = {
  logs: {},
  subscribers: {},
  contextExecutors: {},
};

export const logsApi: LogsApi = {
  subscribe: (loggerId, subscriber) => {
    logsStore.subscribers[loggerId] = logsStore.subscribers[loggerId] || [];
    logsStore.subscribers[loggerId].push(subscriber);
    subscriber([...(logsStore.logs[loggerId] || [])]);

    return () => {
      logsStore.subscribers[loggerId] = logsStore.subscribers[loggerId].filter((x) => x !== subscriber);
    };
  },
  publishChanges: (loggerId) => {
    logsStore.subscribers[loggerId]?.forEach((subscriber) => subscriber([...logsStore.logs[loggerId]]));
  },
  registerContextExecutor: (loggerId, executor, availableVariables) => {
    logsStore.contextExecutors[loggerId] = { executor, availableVariables };
  },
  execute: (loggerId, toEval) => {
    if (!logsStore.contextExecutors[loggerId]) {
      throw new Error(`No context executor found for context "${loggerId}"`);
    }

    const { executor } = logsStore.contextExecutors[loggerId];
    const executionLogger = makeLogger(loggerId);

    try {
      const result = executor(toEval);

      executionLogger.console.log(`> ${toEval}`);
      executionLogger.console.log(result);
    } catch (error) {
      executionLogger.console.error(error);
    }
  },
  getAvailableVariables: (loggerId) => {
    if (!logsStore.contextExecutors[loggerId]) {
      throw new Error(`No context executor found for context "${loggerId}"`);
    }

    const { availableVariables } = logsStore.contextExecutors[loggerId];

    return availableVariables;
  },
};

type Logger = {
  loggerId: LoggerId;
  destruct: () => void;
  console: typeof console;
};

export const makeLogger = (loggerId = uniqueId('logger')): Logger => {
  const counters: Record<string, number> = {};
  const lastCountersLogs: Record<string, Log> = {};
  const timers: Record<string, { start: number; end?: number }> = {};

  logsStore.logs[loggerId] = logsStore.logs[loggerId] || [];

  const addLog = (log: Log) => {
    logsStore.logs[loggerId].push({
      ...log,
    });
    logsApi.publishChanges(loggerId);
  };
  const clearLogs = () => {
    logsStore.logs[loggerId] = [];
    addLog({
      method: 'clear',
      data: ['Console were cleared'],
    });
  };
  const countLogs = (label = 'default', setValue?: number): void => {
    if (setValue === undefined) {
      counters[label] = (counters[label] || 0) + 1;
    } else {
      counters[label] = setValue;
    }
    const log: Log = {
      data: [`${label}: ${counters[label]}`],
      method: 'log',
    };

    const lastCounterLog = lastCountersLogs[loggerId];
    const lastLogIndex = logsStore.logs[loggerId].length - 1;

    if (lastCounterLog && logsStore.logs[loggerId][lastLogIndex] === lastCounterLog) {
      logsStore.logs[loggerId][lastLogIndex] = log;
    } else {
      logsStore.logs[loggerId].push(log);
    }

    lastCountersLogs[loggerId] = log;
    logsApi.publishChanges(loggerId);
  };

  /** TBD: full console logger implementation */
  const handleUnimplemented = (method: Exclude<keyof typeof console, 'Console'>, ...args: any[]) => {
    addLog({
      method: 'warn',
      data: [`console.${method} is not implemented in EsDocs playground console yet, so ${method} redirected to browser console as is`],
    });
    // eslint-disable-next-line no-console
    (console[method] as any)(...args);
  };
  const handleDeprecated = (method: 'profile' | 'profileEnd' | 'timeStamp', ...args: any[]) => {
    addLog({
      method: 'warn',
      data: [`console.${method} is deprecated and will not be implemented in EsDocs playground console yet, so ${method} redirected to browser console as is`],
    });
    // eslint-disable-next-line no-console
    (console[method] as any)(...args);
  };
  const logger: Logger = {
    loggerId,
    destruct: () => {
      delete logsStore.logs[loggerId];
    },
    console: {
      assert: (condition?: boolean, ...data: any[]): void => {
        if (!condition) logger.console.error(...data);
      },
      clear: (): void => {
        clearLogs();
      },
      count: (label = 'default'): void => {
        countLogs(label);
      },
      countReset: (label = 'default'): void => {
        countLogs(label, 0);
      },
      debug: (...data: any[]): void => {
        addLog({ method: 'debug', data });
      },
      dir: (item?: any, options?: any): void => {
        handleUnimplemented('group', [item, options]);
      },
      dirxml: (...data: any[]): void => {
        handleUnimplemented('group', ...data);
      },
      error: (...data: any[]): void => {
        addLog({ method: 'error', data });
      },
      group: (...data: any[]): void => {
        handleUnimplemented('group', ...data);
      },
      groupCollapsed: (...data: any[]): void => {
        handleUnimplemented('groupCollapsed', ...data);
      },
      groupEnd: (): void => {
        handleUnimplemented('groupEnd');
      },
      info: (...data: any[]): void => {
        addLog({ method: 'info', data });
      },
      log: (...data: any[]): void => {
        addLog({ method: 'log', data });
      },
      table: (tabularData?: any, properties?: string[]): void => {
        addLog({ method: 'table', data: [tabularData, properties] });
      },
      time: (label = 'default'): void => {
        addLog({ method: 'time', data: [label] });
        timers[label] = { start: Date.now(), end: undefined };
      },
      timeEnd: (label = 'default'): void => {
        if (!timers[label]) {
          logger.console.warn(`Timer ${label} doesn't exist`);
        } else {
          timers[label].end = Date.now();

          addLog({ method: 'timeEnd', data: [label] });

          // logger.log(`${label}: ${timers[label].end! - timers[label].start} ms`);
        }
      },
      timeLog: (label = 'default', ...data: any[]): void => {
        if (!timers[label]) {
          logger.console.warn(`Timer ${label} doesn't exist`);
        } else {
          logger.console.log(`${label}: ${Date.now() - timers[label].start} ms`, ...data);
        }
      },
      timeStamp: (label?: string): void => {
        handleDeprecated('timeStamp', label);
      },
      trace: (...data: any[]): void => {
        handleUnimplemented('trace', ...data);
      },
      warn: (...data: any[]): void => {
        addLog({ method: 'warn', data });
      },
      profile: (label?: string): void => {
        handleDeprecated('profile', label);
      },
      profileEnd: (label?: string): void => {
        handleDeprecated('profileEnd', label);
      },
      // eslint-disable-next-line no-console
      Console: console.Console,
    },
  };

  // TODO: add unsubscribtion
  // Hook(logger.console, (log) => {
  //   logsStore.logs[loggerId].push(Decode(log));
  //   logsApi.publishChanges(loggerId);
  // });

  return logger;
};
