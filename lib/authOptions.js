import CredentialsProvider from 'next-auth/providers/credentials'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const client = await clientPromise
          const db = client.db('bimbel_db')

          // Email dari form sering ditulis dengan huruf besar/kecil berbeda,
          // atau ikut terisi spasi (autocomplete HP). Database menyimpan email
          // apa adanya, jadi pencocokan harus case-insensitive & di-trim.
          const emailInput = String(credentials?.email || '').trim()
          if (!emailInput || !credentials?.password) return null

          const esc = emailInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const user = await db.collection('users').findOne({
            email: { $regex: '^' + esc + '$', $options: 'i' }
          })

          if (!user) {
            return null
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)

          if (!isValid) {
            return null
          }

          return {
            id: user._id.toString(),
            email: user.email,
            // sebagian dokumen user memakai `nama`, sebagian `name`
            name: user.name || user.nama || '',
            role: user.role
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.iat = Math.floor(Date.now() / 1000) // Issue time
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 jam - session expire otomatis
  },
  jwt: {
    maxAge: 24 * 60 * 60 // 24 jam - JWT expire otomatis
  },
  secret: process.env.NEXTAUTH_SECRET
}
