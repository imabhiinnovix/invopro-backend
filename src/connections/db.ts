import mongoose from 'mongoose';

import config from '../config';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
