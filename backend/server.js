'use strict';
require('dotenv').config();

const http = require('http');
// This path is correct assuming server.js is in the root `backend` folder
const { connectDatabase } = require('./src/utils/database');
const logger = require('./src/utils/logger');
// This is the most important change: we import the configured app from src/app.js
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

