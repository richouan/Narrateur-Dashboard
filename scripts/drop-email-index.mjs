// Connect to MongoDB and drop the email index
import mongoose from 'mongoose'
import 'dotenv/config'

const MONGO_URI = process.env.MONGO_URI

async function dropEmailIndex() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB')
    
    const db = mongoose.connection.db
    await db.collection('users').dropIndex('email_1')
    
    console.log('✅ Successfully dropped email_1 index')
  } catch (error) {
    if (error.code === 27) {
      console.log('ℹ️  Index email_1 does not exist (already dropped)')
    } else {
      console.error('❌ Error:', error.message)
    }
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

dropEmailIndex()
