import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EthicalControls from './EthicalControls';
import PresenceIndicator from './PresenceIndicator';
import NotificationSystem from './NotificationSystem';

const Layout = ({ children }) => {
  return (
    <>
      <Head>
        <title>Nexus - Ethical Social Experience</title>
        <meta name="description" content="A modern social media platform with ethical controls" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <header className="sticky top-0 z-50 glass-dark border-b border-white/5">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 hover-glow transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Nexus
                </span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-1">
                <Link href="/" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Home</span>
                  </div>
                </Link>
                <Link href="/explore" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Explore</span>
                  </div>
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-3" data-testid="user-menu">
              <Link href="/login" className="hidden sm:block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200">
                Login
              </Link>
              <Link href="/register" className="btn-primary px-6 py-2 text-sm hover-lift">
                Sign Up
              </Link>
              <div className="ml-2">
                <EthicalControls />
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <PresenceIndicator />
      <NotificationSystem />

      <footer className="py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Ethical Social Experience
      </footer>
      </div>
    </>
  );
};

export default Layout;
