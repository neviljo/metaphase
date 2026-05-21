import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '8081'),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/phaserQuest',
};
