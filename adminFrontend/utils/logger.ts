type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'cookie', 'latitude', 'longitude'];

class Logger {
    private isDev = process.env.NODE_ENV !== 'production';

    private redact(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.redact(item));

        const redacted: any = { ...obj };
        for (const key of Object.keys(redacted)) {
            if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
                redacted[key] = '[REDACTED]';
            } else if (typeof redacted[key] === 'object') {
                redacted[key] = this.redact(redacted[key]);
            }
        }
        return redacted;
    }

    private log(level: LogLevel, context: string, message: string, data?: any) {
        if (level === 'debug' && !this.isDev) return;

        const timestamp = new Date().toLocaleTimeString();
        const formattedData = data ? this.redact(data) : '';
        const consoleMethod = level === 'debug' ? 'log' : level;

        console[consoleMethod as 'log' | 'info' | 'warn' | 'error'](
            `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`,
            formattedData || ''
        );
    }

    debug(ctx: string, msg: string, data?: any) { this.log('debug', ctx, msg, data); }
    info(ctx: string, msg: string, data?: any) { this.log('info', ctx, msg, data); }
    warn(ctx: string, msg: string, data?: any) { this.log('warn', ctx, msg, data); }
    error(ctx: string, msg: string, data?: any) { this.log('error', ctx, msg, data); }

    logFetch(url: string, options?: any, status?: number) {
        const method = options?.method || 'GET';
        this.debug('API', `${method} ${url}`, { status, ...options });
    }
}

export const logger = new Logger();
