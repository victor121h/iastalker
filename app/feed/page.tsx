'use client';

import { motion } from 'framer-motion';
import InstagramHeader from '@/components/InstagramHeader';
import StoriesBar from '@/components/StoriesBar';

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-instagram-bg">
      <InstagramHeader />
      <StoriesBar />
      
      <main className="max-w-2xl mx-auto pt-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-center py-20"
        >
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-instagram-border flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h2 className="text-white text-2xl font-bold">Nenhuma publicação ainda</h2>
            <p className="text-instagram-text-medium">Quando @******** publicar, você verá as fotos e vídeos aqui.</p>
          </div>
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-12 bg-instagram-bg border-t border-instagram-border flex items-center justify-around">
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" strokeLinecap="round" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
