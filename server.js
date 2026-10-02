// server.js
// Entry point. Initializes the SQLite database (auto-creating the file,
// schema, and default seed data) and starts the Express server.

const createApp = require('./app');
const { getDb, DB_PATH } = require('./database/database');

const PORT = process.env.PORT || 8080;

// Initialize DB before starting the server so the first request never races init.
getDb();
console.log(`SQLite database ready at: ${DB_PATH}`);

const app = createApp();

app.listen(PORT, () => {
  console.log(`Social Style Assessment app running at http://localhost:${PORT}`);
  console.log(`Social Style Assessment app running at http://192.168.1.105:${PORT}`);
});
