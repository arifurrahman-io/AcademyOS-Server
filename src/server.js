const app = require('./app');
const connectDB = require('./config/db');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected successfully');

    // 2. Start Server
    const serverPort = PORT || 5000;
    app.listen(serverPort, () => {
      console.log(`🚀 AcademyOS API running at http://localhost:${serverPort}`);
    });

  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

startServer();
