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
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      session.user.id = token.id
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET
})

export { handler as GET, handler as POST }
```

---

## Yang Berubah:

✅ Pakai `clientPromise` dari `/lib/mongodb.js` yang sudah benar
✅ Pakai `db('bimbel_db')` langsung
✅ Fix `user._id.toString()` bukan `user.id`
✅ Hapus hardcoded demo account
✅ Tambah console.log untuk debugging

---

Commit → deploy → **jalankan script `create-users.js` dulu kalau belum** → lalu coba login lagi dengan:
```
Email: owner@bimbel.com
Password: owner123
