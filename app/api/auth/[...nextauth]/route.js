import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('Login attempt:', { email: credentials?.email })

          const client = await clientPromise
          const db = client.db('bimbel_db')
          
          const user = await db.collection('users').findOne({ email: credentials.email })

          if (!user) {
            console.log('User not found')
            return null
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)

          if (!isValid) {
            console.log('Invalid password')
            return null
          }

          console.log('Login success:', { email: user.email, role: user.role })

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
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
      
      // Log untuk debugging
      console.log('JWT Callback - Role:', token.role, 'Email:', token.email)
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
      }
      
      // Log untuk debugging
      console.log('Session Callback - Role:', session.user?.role, 'Email:', session.user?.email)
      
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
})

export { handler as GET, handler as POST }
