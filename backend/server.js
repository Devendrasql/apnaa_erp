'use strict';
require('dotenv').config();

const http = require('http');
// Suppress specific Node deprecation warnings from third-party deps (e.g., util._extend DEP0060)
// This keeps logs clean in production while we await upstream fixes.
try {
  const originalEmitWarning = process.emitWarning;
  // eslint-disable-next-line no-underscore-dangle
  process.emitWarning = function patchedEmitWarning(warning, ...args) {
    try {
      const msg = typeof warning === 'string' ? warning : (warning?.message || '');
      const code = typeof warning === 'object' ? warning?.code : args?.[1];
      if (code === 'DEP0060' || msg.includes('DEP0060') || msg.includes('util._extend')) {
        return; // ignore this noisy deprecation from dependencies
      }
    } catch (_) {}
    return originalEmitWarning.call(process, warning, ...args);
  };
} catch (_) {}
// ===================================================================================
// === THE FIX ===
// The path is now corrected. From `server.js` in the root, it correctly
// looks for the `utils` folder in the same directory.
const { connectDatabase, closeDatabase } = require('./utils/database');
const logger = require('./utils/logger');
// ===================================================================================
const app = require('./src/app');

const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

(async () => {
    try {
        await connectDatabase();
        logger.info('Database connection established.');

        server.listen(PORT, () => {
            logger.info(`Apnaa ERP Backend is running on port ${PORT}`);
            console.log(`🚀 Server ready at http://localhost:${PORT}`);
        });

    } catch (err) {
        logger.error('Failed to start the server:', err);
        process.exit(1);
    }
})();


// Graceful shutdown & hardening
function shutdown(reason) {
    try {
        logger.warn(`Shutdown initiated: ${reason}`);
        // stop accepting new connections
        server.close(async () => {
            logger.info('HTTP server closed');
            try { await closeDatabase(); } catch (e) { logger.error('DB close error', e); }
            process.exit(0);
        });
        // force exit if not closed within timeout
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();
    } catch (e) {
        logger.error('Error during shutdown', e);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', err);
    shutdown('unhandledRejection');
});
