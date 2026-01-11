
import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, ChatMessage, GiftNotification, TikTokGiftEvent, ServerConfig, ServerType, DonationPlatform, TikTokLikeEvent, LeaderboardEntry } from '../types';
import { giftValues } from '../data/gifts';

interface TikTokChatEvent {
  uniqueId: string;
  nickname: string;
  comment: string;
  profilePictureUrl: string;
  msgId: string;
  timestamp: number;
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
    giftId: 99999,
  };
};

export const useTikTokLive = (
    onMessage: (message: ChatMessage) => void,
    onGift: (gift: Omit<GiftNotification, 'id'>) => void,
    onLike: (like: Omit<LeaderboardEntry, 'score'> & { score: number; totalLikeCount?: number }) => void,
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

  const handleIndoFinityMessage = (event: string, data: TikTokGiftEvent | TikTokLikeEvent) => {
    const donationPlatforms: DonationPlatform[] = ['saweria', 'sociabuzz', 'trakteer', 'tako', 'bagibagi', 'sibagi'];
    const timestamp = data.timestamp || Date.now();
    
    if (!timeSyncedRef.current && data.timestamp) {
        onSyncTimeRef.current(data.timestamp);
        timeSyncedRef.current = true;
    }

    if (event === 'chat') {
        const chatData = data as TikTokGiftEvent;
        onMessageRef.current({
            id: chatData.msgId || `${Date.now()}`,
            userId: chatData.uniqueId,
            nickname: chatData.nickname,
            comment: (data as any).comment || '',
            profilePictureUrl: chatData.profilePictureUrl,
            isWinner: false,
            timestamp: timestamp,
        });
    } else if (event === 'gift') {
        const giftData = data as TikTokGiftEvent;
        if (giftData.giftType === 1 && !giftData.repeatEnd) return;

        const singleGiftValue = giftData.diamondCount && giftData.diamondCount > 0 
            ? giftData.diamondCount 
            : giftValues.get(giftData.giftId) || 1;

        const totalValue = singleGiftValue * (giftData.giftCount || 1);
        
        onGiftRef.current({
            msgId: giftData.msgId,
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

  const connectToRawWS = (url: string) => {
    const ws = new WebSocket(url);
    connectionRef.current = ws;

    ws.onopen = () => {
        console.log(`Terhubung ke Raw WebSocket: ${url}`);
        setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.event && message.data) {
                handleIndoFinityMessage(message.event, message.data);
            }
        } catch (e) {
            console.error('Error parsing WS message:', e);
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError(`Gagal terhubung ke ${url}. Pastikan alamat IP dan Port benar.`);
        setConnectionStatus('error');
    };

    ws.onclose = () => {
        if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    };
  };

  const connect = useCallback((config: ServerConfig) => {
    if (connectionRef.current) disconnect();

    setConnectionStatus('connecting');
    setError(null);
    timeSyncedRef.current = false;

    if (config.type === ServerType.CUSTOM && config.url?.startsWith('ws')) {
        connectToRawWS(config.url);
        return;
    }

    switch (config.type) {
      case ServerType.RAILWAY_1:
      case ServerType.RAILWAY_2:
      case ServerType.CUSTOM:
        connectToRailway(config);
        break;
      case ServerType.INDOFINITY_WEBSOCKET:
        connectToRawWS('ws://localhost:62024');
        break;
      case ServerType.INDOFINITY_SOCKETIO:
        connectToIndoFinitySocketIO();
        break;
    }
  }, [disconnect]);

  const connectToIndoFinitySocketIO = () => {
    const socket = io('http://localhost:62025');
    connectionRef.current = socket;
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('message', (data) => handleIndoFinityMessage(data.event, data.data));
    socket.on('connect_error', () => {
        setError('Gagal terhubung ke IndoFinity Socket.IO.');
        setConnectionStatus('error');
    });
    socket.on('disconnect', () => {
        if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    });
  };

  const connectToRailway = (config: ServerConfig) => {
    if (!config.url || !config.username) {
        setError('URL atau Username tidak boleh kosong.');
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
        comment: data.comment || '',
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
        if (data.giftType === 1 && !data.repeatEnd) return;
        const singleGiftValue = data.diamondCount && data.diamondCount > 0 ? data.diamondCount : giftValues.get(data.giftId) || 1;
        const totalValue = singleGiftValue * (data.giftCount || 1);
        onGiftRef.current({
            msgId: data.msgId,
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
            score: data.likeCount,
            totalLikeCount: data.totalLikeCount
        });
    });
    socket.on('streamEnd', () => {
        setError('Siaran langsung telah berakhir.');
        setConnectionStatus('disconnected');
        socket.disconnect();
    });
    socket.on('connect_error', () => {
      setError(`Gagal terhubung ke ${config.url}.`);
      setConnectionStatus('error');
    });
  };

  return { connectionStatus, connect, disconnect, error };
};
