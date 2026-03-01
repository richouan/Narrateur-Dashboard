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
    await mongoose.connect(uri)
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
