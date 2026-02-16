import { connectDB } from '../utils/db'

export default defineEventHandler(async () => {
  await connectDB()
})
