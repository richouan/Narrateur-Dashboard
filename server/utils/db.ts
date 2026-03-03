import mongoose from 'mongoose'
import dns from 'dns'

// Fix for Windows: local router DNS can't handle MongoDB SRV queries properly
// Force Node.js to use Google's public DNS instead
dns.setServers(['8.8.8.8', '1.1.1.1'])

let isConnected = false

export async function connectDB(): Promise<void> {
  if (isConnected) return

  const config = useRuntimeConfig()
  const uri = config.mongoUri

  if (!uri) {
    throw new Error('MONGO_URI is not defined')
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 5,        // max 5 concurrent connections (fine for 2 GB VPS)
      minPoolSize: 1,        // keep 1 connection alive so first request is instant
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 30000,
    })
    isConnected = true
    console.log('[DB] Connected to MongoDB Atlas')
  } catch (error) {
    console.error('[DB] Connection failed:', error)
    throw error
  }
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1
}
