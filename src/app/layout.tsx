import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Genix Connect',
  description: 'Smart Tuition Management System — Connecting Students & Teachers',
  icons: {
    icon: [{ url: '/favicon-icon.png', type: 'image/png' }],
    shortcut: '/favicon-icon.png',
    apple: '/favicon-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon-icon.png" type="image/png" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
