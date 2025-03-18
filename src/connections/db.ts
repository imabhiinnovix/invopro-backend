import mongoose from 'mongoose';

import config from '../config';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI!, {
      connectTimeoutMS: 30000, // Increase connection timeout
      serverSelectionTimeoutMS: 30000, // Extend server selection timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
