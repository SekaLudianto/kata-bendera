
import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, ChatMessage, GiftNotification, TikTokGiftEvent, ServerConfig, ServerType, DonationPlatform, TikTokLikeEvent, LeaderboardEntry } from '../types';
import { giftValues } from '../data/gifts';

// Define the shape of the chat data coming from the backend
interface TikTokChatEvent {
  uniqueId: string;
  nickname: string;
  comment: string;
  profilePictureUrl: string;
  msgId: string;
  timestamp: number; // Add timestamp to the expected event data
}

const parseTikTokError = (reason: string): string => {
    if (typeof reason !== 'string') return 'Terjadi error yang tidak diketahui.';
    if (reason.includes('user_not_found') || reason.includes('19881007')) return 'Username tidak ditemukan atau tidak sedang live.';
    if (reason.includes('websocket upgrade')) return 'Koneksi ke TikTok gagal (websocket ditolak).';
    if (reason.includes('timeout')) return 'Koneksi ke TikTok timeout.';
    if (reason.includes('Connection lost')) return 'Koneksi ke TikTok terputus.';
    return `Gagal terhubung: ${reason}`;
};

const indofinityDonationAdapter = (platform: DonationPlatform, data: any): Omit<GiftNotification, 'id'> => {
  return {
    userId: data.from_name || platform,
    nickname: data.from_name || 'Donatur',
    profilePictureUrl: `https://i.pravatar.cc/40?u=${data.from_name || platform}`,
    giftName: `${data.message || `Donasi via ${platform}`} (Rp ${data.amount.toLocaleString()})`,
    giftCount: data.amount,
    giftId: 99999, // generic ID for donations
  };
};

export const useTikTokLive = (
    onMessage: (message: ChatMessage) => void,
    onGift: (gift: Omit<GiftNotification, 'id'>) => void,
    onLike: (like: Omit<LeaderboardEntry, 'score'> & { score: number; totalLikeCount?: number }) => void, // score is likeCount
    onSyncTime: (timestamp: number) => void
) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<Socket | WebSocket | null>(null);
  const timeSyncedRef = useRef(false);

  const onMessageRef = useRef(onMessage);
  const onGiftRef = useRef(onGift);
  const onLikeRef = useRef(onLike);
  const onSyncTimeRef = useRef(onSyncTime);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onGiftRef.current = onGift;
    onLikeRef.current = onLike;
    onSyncTimeRef.current = onSyncTime;
  }, [onMessage, onGift, onLike, onSyncTime]);

  useEffect(() => {
    return () => { // Cleanup on unmount
      if (connectionRef.current) {
        if (connectionRef.current instanceof WebSocket) {
          connectionRef.current.close();
        } else {
          connectionRef.current.disconnect();
        }
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (connectionRef.current) {
        if (connectionRef.current instanceof WebSocket) {
            connectionRef.current.close();
        } else {
            connectionRef.current.disconnect();
        }
        connectionRef.current = null;
    }
    setConnectionStatus('idle');
  }, []);

  const connect = useCallback((config: ServerConfig) => {
    if (connectionRef.current) disconnect();

    setConnectionStatus('connecting');
    setError(null);
    timeSyncedRef.current = false; // Reset time sync flag on new connection

    switch (config.type) {
      case ServerType.RAILWAY_1:
      case ServerType.RAILWAY_2:
      case ServerType.CUSTOM:
        connectToRailway(config);
        break;
      case ServerType.INDOFINITY_WEBSOCKET:
        connectToIndoFinityWS();
        break;
      case ServerType.INDOFINITY_SOCKETIO:
        connectToIndoFinitySocketIO();
        break;
    }
  }, [disconnect]);

  const handleIndoFinityMessage = (event: string, data: TikTokGiftEvent | TikTokLikeEvent) => {
    const donationPlatforms: DonationPlatform[] = ['saweria', 'sociabuzz', 'trakteer', 'tako', 'bagibagi', 'sibagi'];
    const timestamp = data.timestamp || Date.now();
    
    if (!timeSyncedRef.current && data.timestamp) {
        onSyncTimeRef.current(data.timestamp);
        timeSyncedRef.current = true;
    }

    if (event === 'chat') {
        const chatData = data as TikTokGiftEvent; // Can be treated same as gift event for user info
        onMessageRef.current({
            id: chatData.msgId || `${Date.now()}`,
            userId: chatData.uniqueId,
            nickname: chatData.nickname,
            comment: (data as any).comment || '', // Fallback to empty string if undefined
            profilePictureUrl: chatData.profilePictureUrl,
            isWinner: false,
            timestamp: timestamp,
        });
    } else if (event === 'gift') {
        const giftData = data as TikTokGiftEvent;
        // Handle gift streaks. Only process the final event of a streak.
        if (giftData.giftType === 1 && !giftData.repeatEnd) {
            // Streak in progress, ignore this intermediate event.
            return;
        }

        // Prioritize server-sent diamondCount, otherwise use local gift map as fallback.
        const singleGiftValue = giftData.diamondCount && giftData.diamondCount > 0 
            ? giftData.diamondCount 
            : giftValues.get(giftData.giftId) || 1; // Fallback to 1 if unknown

        const totalValue = singleGiftValue * (giftData.giftCount || 1);
        
        onGiftRef.current({
            msgId: giftData.msgId, // Pass msgId for deduplication
            userId: giftData.uniqueId,
            nickname: giftData.nickname,
            profilePictureUrl: giftData.profilePictureUrl,
            giftName: giftData.giftName,
            giftCount: totalValue,
            giftId: giftData.giftId,
        });
    } else if (event === 'like') {
        const likeData = data as TikTokLikeEvent;
        onLikeRef.current({
            userId: likeData.uniqueId,
            nickname: likeData.nickname,
            profilePictureUrl: likeData.profilePictureUrl || `https://i.pravatar.cc/40?u=${likeData.uniqueId}`,
            score: likeData.likeCount,
            totalLikeCount: likeData.totalLikeCount
        });
    } else if (donationPlatforms.includes(event as DonationPlatform)) {
        const giftData = indofinityDonationAdapter(event as DonationPlatform, data);
        onGiftRef.current(giftData);
    }
  };

  const connectToIndoFinityWS = () => {
    const ws = new WebSocket('ws://localhost:62024');
    connectionRef.current = ws;

    ws.onopen = () => {
        console.log('Terhubung ke IndoFinity WebSocket');
        setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleIndoFinityMessage(message.event, message.data);
        } catch (e) {
            console.error('Error parsing IndoFinity WS message:', e);
        }
    };

    ws.onerror = (err) => {
        console.error('IndoFinity WebSocket error:', err);
        setError('Gagal terhubung ke IndoFinity WebSocket. Pastikan server lokal berjalan.');
        setConnectionStatus('error');
    };

    ws.onclose = () => {
        console.log('Koneksi IndoFinity WebSocket ditutup');
        if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    };
  };

  const connectToIndoFinitySocketIO = () => {
    const socket = io('http://localhost:62025');
    connectionRef.current = socket;

    socket.on('connect', () => {
        console.log('Terhubung ke IndoFinity Socket.IO');
        setConnectionStatus('connected');
    });

    socket.on('message', (data) => {
        try {
            handleIndoFinityMessage(data.event, data.data);
        } catch (e) {
            console.error('Error parsing IndoFinity Socket.IO message:', e);
        }
    });

    socket.on('connect_error', (err) => {
        console.error('IndoFinity Socket.IO error:', err);
        setError('Gagal terhubung ke IndoFinity Socket.IO. Pastikan server lokal berjalan.');
        setConnectionStatus('error');
    });

    socket.on('disconnect', () => {
        console.log('Koneksi IndoFinity Socket.IO terputus');
        if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    });
  };

  const connectToRailway = (config: ServerConfig) => {
    if (!config.url || !config.username) {
        setError('URL Server atau Username TikTok tidak boleh kosong.');
        setConnectionStatus('error');
        return;
    }
    const socket = io(config.url);
    connectionRef.current = socket;

    socket.on('connect', () => socket.emit('setUniqueId', config.username, {}));
    socket.on('tiktokConnected', () => setConnectionStatus('connected'));
    socket.on('tiktokDisconnected', (reason: string) => {
      setError(parseTikTokError(reason));
      setConnectionStatus('error');
      socket.disconnect();
    });
    socket.on('chat', (data: TikTokChatEvent) => {
      if (!timeSyncedRef.current && data.timestamp) {
        onSyncTimeRef.current(data.timestamp);
        timeSyncedRef.current = true;
      }
      onMessageRef.current({
        id: data.msgId,
        userId: data.uniqueId,
        nickname: data.nickname,
        comment: data.comment || '', // Fallback to empty string if undefined
        profilePictureUrl: data.profilePictureUrl,
        isWinner: false,
        timestamp: data.timestamp || Date.now(),
      });
    });
    socket.on('gift', (data: TikTokGiftEvent) => {
        if (!timeSyncedRef.current && data.timestamp) {
          onSyncTimeRef.current(data.timestamp);
          timeSyncedRef.current = true;
        }

        // Handle gift streaks. Only process the final event of a streak.
        if (data.giftType === 1 && !data.repeatEnd) {
            // Streak in progress, ignore this intermediate event.
            return;
        }
        
        // Prioritize server-sent diamondCount, otherwise use local gift map as fallback.
        const singleGiftValue = data.diamondCount && data.diamondCount > 0 
            ? data.diamondCount 
            : giftValues.get(data.giftId) || 1; // Fallback to 1 if unknown

        const totalValue = singleGiftValue * (data.giftCount || 1);

        onGiftRef.current({
            msgId: data.msgId, // Pass msgId for deduplication
            userId: data.uniqueId,
            nickname: data.nickname,
            profilePictureUrl: data.profilePictureUrl,
            giftName: data.giftName,
            giftCount: totalValue,
            giftId: data.giftId,
        });
    });
    socket.on('like', (data: TikTokLikeEvent) => {
        if (!timeSyncedRef.current && data.timestamp) {
          onSyncTimeRef.current(data.timestamp);
          timeSyncedRef.current = true;
        }
        onLikeRef.current({
            userId: data.uniqueId,
            nickname: data.nickname,
            profilePictureUrl: data.profilePictureUrl || `https://i.pravatar.cc/40?u=${data.uniqueId}`,
            score: data.likeCount, // score is the number of likes in this batch
            totalLikeCount: data.totalLikeCount
        });
    });
    socket.on('streamEnd', () => {
        setError('Siaran langsung telah berakhir.');
        setConnectionStatus('disconnected');
        socket.disconnect();
    });
    socket.on('connect_error', (err) => {
      setError(`Gagal terhubung ke ${config.url}. Pastikan server berjalan.`);
      setConnectionStatus('error');
    });
    socket.on('disconnect', () => {
      if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    });
  };

  return { connectionStatus, connect, disconnect, error };
};
