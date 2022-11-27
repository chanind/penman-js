export interface Logger {
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

let _logger: Logger | null = null;

export const setLogger = (logger: Logger) => {
  _logger = logger;
};

export const log = (message: string): void => {
  if (_logger) {
    _logger.log(message);
  }
};

export const warn = (message: string): void => {
  if (_logger) {
    _logger.warn(message);
  }
};

export const error = (message: string): void => {
  if (_logger) {
    _logger.error(message);
  }
};

export const debug = (message: string): void => {
  if (_logger) {
    _logger.debug(message);
  }
};
