const mongoose = require('mongoose');
const dns = require('dns'); // Add this line
const { MONGO_URI } = require('./env');

// Force Node.js to use Google DNS for SRV record resolution
dns.setServers(['8.8.8.8', '1.1.1.1']); 

const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Avoid multiple connections in dev
    if (mongoose.connections[0].readyState) {
      console.log('✅ MongoDB already connected');
      return;
    }

    const conn = await mongoose.connect(MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000, 
    });

    console.log(`✅ Successfully connected to MongoDB: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected!');
    });

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;