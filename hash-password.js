import bcrypt from "bcryptjs"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

async function resetOwner() {
  await client.connect()
  const db = client.db("bimbel")

  const newPassword = "owner123"
  const hash = await bcrypt.hash(newPassword, 10)

  await db.collection("users").updateOne(
    { email: "owner@bimbel.com" },
    { $set: { password: hash } }
  )

  console.log("✅ Password owner di-reset")
  await client.close()
}

resetOwner()
