'use client';

import { motion } from 'framer-motion';

interface Story {
  id: number;
  username: string;
  avatar: string;
  isLocked: boolean;
}

interface StoriesBarProps {
  targetUsername?: string;
  targetAvatar?: string;
}

export default function StoriesBar({ targetUsername, targetAvatar }: StoriesBarProps) {
  const getProxiedAvatar = (url: string) => {
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const mockStories: Story[] = [
    { 
      id: 1, 
      username: targetUsername ? `${targetUsername.charAt(0)}*****` : 'Seu story', 
      avatar: targetAvatar ? getProxiedAvatar(targetAvatar) : 'https://i.pravatar.cc/68?img=1', 
      isLocked: false 
    },
    { id: 2, username: 'm*****', avatar: 'https://i.pravatar.cc/68?img=5', isLocked: true },
    { id: 3, username: 'j*****', avatar: 'https://i.pravatar.cc/68?img=12', isLocked: true },
    { id: 4, username: 'a*****', avatar: 'https://i.pravatar.cc/68?img=9', isLocked: true },
    { id: 5, username: 'c*****', avatar: 'https://i.pravatar.cc/68?img=13', isLocked: true },
    { id: 6, username: 'j*****', avatar: 'https://i.pravatar.cc/68?img=20', isLocked: true },
    { id: 7, username: 'p*****', avatar: 'https://i.pravatar.cc/68?img=15', isLocked: true },
    { id: 8, username: 'r*****', avatar: 'https://i.pravatar.cc/68?img=22', isLocked: true },
  ];

  return (
    <div className="w-full bg-instagram-bg border-b border-instagram-border py-4 overflow-x-auto">
      <div className="flex gap-3 px-4">
        {mockStories.map((story, index) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.05 }}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              <div className="story-gradient-border">
                <div className="bg-instagram-bg rounded-full p-0.5">
                  <img
                    src={story.avatar}
                    alt={story.username}
                    className="w-[68px] h-[68px] rounded-full object-cover"
                  />
                </div>
              </div>
              {story.isLocked && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-xs text-instagram-text-white max-w-[68px] truncate">
              {story.username}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
