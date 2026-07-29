type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function shouldLog(level: LogLevel) {
  if (level === "debug" && !isDev()) {
    return false;
  }

  return true;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    ...(context ?? {}),
  };

  const line = isDev() ? payload : JSON.stringify(payload);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.info(line);
  }
}

function toContext(args: unknown[]): LogContext | undefined {
  if (args.length === 0) {
    return undefined;
  }

  if (args.length === 1 && args[0] && typeof args[0] === "object") {
    const value = args[0] as Record<string, unknown>;

    if (value instanceof Error) {
      return {
        error: value.message,
        ...(isDev() ? { stack: value.stack } : {}),
      };
    }

    return value;
  }

  return { details: args };
}

/** Central logging — use domain helpers for audits. */
export const LoggerService = {
  debug(message: string, context?: LogContext) {
    write("debug", message, context);
  },

  info(message: string, context?: LogContext) {
    write("info", message, context);
  },

  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },

  error(message: string, context?: LogContext) {
    write("error", message, context);
  },

  audit(message: string, context?: LogContext) {
    write("info", `[audit] ${message}`, context);
  },

  stripe(message: string, context?: LogContext) {
    write("info", `[stripe] ${message}`, context);
  },

  import(message: string, context?: LogContext) {
    write("info", `[import] ${message}`, context);
  },

  notification(message: string, context?: LogContext) {
    write("info", `[notification] ${message}`, context);
  },
};

/**
 * Backward-compatible logger used across the codebase.
 * Prefer LoggerService for new code.
 */
export const logger = {
  info: (...args: unknown[]) => {
    const [first, ...rest] = args;
    if (typeof first === "string") {
      LoggerService.info(first, toContext(rest));
      return;
    }
    LoggerService.info("log", toContext(args));
  },
  warn: (...args: unknown[]) => {
    const [first, ...rest] = args;
    if (typeof first === "string") {
      LoggerService.warn(first, toContext(rest));
      return;
    }
    LoggerService.warn("log", toContext(args));
  },
  error: (...args: unknown[]) => {
    const [first, ...rest] = args;
    if (typeof first === "string") {
      LoggerService.error(first, toContext(rest));
      return;
    }
    LoggerService.error("log", toContext(args));
  },
  debug: (...args: unknown[]) => {
    const [first, ...rest] = args;
    if (typeof first === "string") {
      LoggerService.debug(first, toContext(rest));
      return;
    }
    LoggerService.debug("log", toContext(args));
  },
};

export type { LogLevel, LogContext };
