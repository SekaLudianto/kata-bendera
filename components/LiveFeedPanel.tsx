
import React, { useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveFeedEvent, ChatMessage, GiftNotification } from '../types';
import { GiftIcon } from './IconComponents';

const ChatItem: React.FC<ChatMessage> = ({ id, nickname, comment, profilePictureUrl, isWinner }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    layout
    className={`p-2 rounded-lg flex items-start gap-2.5 ${
      isWinner ? 'bg-amber-500/10' : 'bg-gray-900/50'
    }`}
  >
    <img
      src={profilePictureUrl || 'https://i.pravatar.cc/40'}
      alt={nickname}
      className="w-8 h-8 rounded-full mt-0.5 shrink-0"
    />
    <div className="flex-1 min-w-0">
      <p className={`font-semibold text-xs ${isWinner ? 'text-amber-300' : 'text-sky-300'}`}>
        {nickname}
      </p>
      <p className="text-white break-words text-sm">{comment}</p>
    </div>
  </motion.div>
);

const GiftItem: React.FC<GiftNotification> = ({ id, nickname, profilePictureUrl, giftName, giftCount }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    layout
    className="p-2 rounded-lg flex items-center gap-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10"
  >
    <div className="shrink-0 relative">
      <img
        src={profilePictureUrl}
        alt={nickname}
        className="w-8 h-8 rounded-full border-2 border-amber-400/50"
      />
      <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-0.5">
          <GiftIcon className="w-2.5 h-2.5 text-white"/>
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-xs text-amber-300">
        {nickname}
      </p>
      <p className="text-white break-words text-sm">
        Mengirim {giftCount}x {giftName}!
      </p>
    </div>
  </motion.div>
);


interface LiveFeedPanelProps {
  feed: LiveFeedEvent[];
}

const LiveFeedPanel: React.FC<LiveFeedPanelProps> = ({ feed }) => {
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Scroll to the top (most recent) item
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = 0;
    }
  }, [feed]);

  return (
    <div className="hidden lg:flex flex-col flex-1 h-[80vh] min-h-[600px] max-h-[800px] bg-gray-800 rounded-3xl shadow-lg shadow-sky-500/5 border border-gray-700 overflow-hidden">
      <header className="p-3 text-center border-b border-gray-700 shrink-0">
        <h2 className="text-md font-bold text-gray-300">Live Interaksi</h2>
      </header>
      <div ref={feedContainerRef} className="flex-grow overflow-y-auto p-3 flex flex-col-reverse">
        <div className="space-y-2">
            <AnimatePresence initial={false}>
            {feed.map((item) => {
                // Using property check as a type guard
                if ('comment' in item) {
                    return <ChatItem key={item.id} {...item} />;
                } else if ('giftName' in item) {
                    return <GiftItem key={item.id} {...item} />;
                }
                return null;
            })}
            </AnimatePresence>
            {feed.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Menunggu interaksi dari penonton...</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveFeedPanel;
