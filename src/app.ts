import express from 'express';

import config from './config';
import connectDB from './connections/db';
import configureExpress from './express-config';

const app = express();
const port = config.PORT || 5000;

const main = async (): Promise<void> => {
  try {
    await connectDB();

    await configureExpress(app);

    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {}
};

main();
