'use strict';
require('dotenv').config();

const http = require('http');
// ===================================================================================
// === THE FIX ===
// The path is now corrected. From `server.js` in the root, it correctly
// looks for the `utils` folder in the same directory.
const { connectDatabase } = require('./utils/database');
const logger = require('./utils/logger');
// ===================================================================================
const app = require('./src/app');

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

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

