import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user?.email) {
        // Check if user is admin
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', session.user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          session.user.isAdmin = userData.isAdmin || false;
        } else {
          // Create new user if they don't exist
          const isAdmin = session.user.email.includes('admin');
          await addDoc(collection(db, 'users'), {
            email: session.user.email,
            isAdmin,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
          });
          session.user.isAdmin = isAdmin;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
  },
}; 