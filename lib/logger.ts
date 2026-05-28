type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = process.env.NODE_ENV !== 'production'

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  if (!isDev && (level === 'debug' || level === 'info')) return
  const prefix = `[${level.toUpperCase()}][${module}]`
  const args = data !== undefined ? [prefix, message, data] : [prefix, message]
  if (level === 'error') console.error(...args)
  else if (level === 'warn') console.warn(...args)
  else console.log(...args)
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: unknown) => log('debug', module, msg, data),
    info: (msg: string, data?: unknown) => log('info', module, msg, data),
    warn: (msg: string, data?: unknown) => log('warn', module, msg, data),
    error: (msg: string, data?: unknown) => log('error', module, msg, data),
  }
}

export const logger = createLogger('app')
