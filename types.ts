
export interface Country {
  name: string;
  code: string;
}

export interface ChatMessage {
  id: string;
  nickname: string;
  comment: string;
  profilePictureUrl?: string;
  isWinner?: boolean;
}

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  profilePictureUrl?: string;
}

export interface RoundWinner extends LeaderboardEntry {
  time: number;
  answer?: string; // Jawaban spesifik untuk mode ABC 5 Dasar
  bonus?: number; // Poin bonus untuk jawaban unik
}

export interface GiftNotification {
  id: string;
  nickname: string;
  profilePictureUrl: string;
  giftName: string;
  giftCount: number;
}

// Raw event from backend
export interface TikTokGiftEvent {
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  giftName: string;
  giftCount: number;
  giftId: number; // e.g., 5655 for Rose
}

export type LiveFeedEvent = ChatMessage | GiftNotification;

export enum GameState {
    Setup = 'setup',
    Connecting = 'connecting',
    Playing = 'playing',
    Champion = 'champion',
    Finished = 'finished',
}

export enum GameMode {
  GuessTheFlag = 'guess_the_flag',
  ABC5Dasar = 'abc_5_dasar',
}

export type AbcCategory = 'Negara' | 'Buah' | 'Hewan' | 'Benda' | 'Profesi' | 'Kota di Indonesia' | 'Tumbuhan';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';