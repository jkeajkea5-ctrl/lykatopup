import mongoose from 'mongoose';
import dns from 'node:dns';

let connectionPromise;

export function connectDatabase() {
  if (process.env.MONGODB_DNS_SERVERS) {
    dns.setServers(process.env.MONGODB_DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean));
  }
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        autoIndex: process.env.NODE_ENV !== 'production',
        maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
        minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
        serverSelectionTimeoutMS: 7000,
        socketTimeoutMS: 30000,
        maxIdleTimeMS: 30000
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  return connectionPromise;
}
