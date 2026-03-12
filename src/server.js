const app = require('./app');
const { connectDB } = require('./config/db');
const config = require('./config');

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`YUK 24 API running on http://localhost:${config.port}`);
  });
}).catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
