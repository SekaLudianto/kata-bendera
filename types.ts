
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

export enum GameStyle {
    Classic = 'classic',
    Knockout = 'knockout',
}

export enum GameState {
    Setup = 'setup',
    Connecting = 'connecting',
    Playing = 'playing',
    Paused = 'paused',
    Champion = 'champion',
    Finished = 'finished',
    KnockoutRegistration = 'knockout_registration',
    KnockoutDrawing = 'knockout_drawing',
    KnockoutPlaying = 'knockout_playing',
}

export enum GameMode {
  GuessTheFlag = 'guess_the_flag',
  ABC5Dasar = 'abc_5_dasar',
  GuessTheWord = 'guess_the_word',
}

export type AbcCategory = 'Negara' | 'Buah' | 'Hewan' | 'Benda' | 'Profesi' | 'Kota di Indonesia' | 'Tumbuhan';
export type WordCategory = 'Pemain Bola' | 'Klub Bola';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

// --- Knockout Mode Types ---
export interface KnockoutPlayer {
  nickname: string;
  profilePictureUrl?: string;
}

export interface KnockoutMatch {
  id: string;
  player1: KnockoutPlayer | null; // Null indicates a BYE or placeholder
  player2: KnockoutPlayer | null;
  winner: KnockoutPlayer | null;
  roundIndex: number; // The round this match belongs to (0 for first round)
  matchIndex: number; // The index of the match within its round
}

export type KnockoutRound = KnockoutMatch[];
export type KnockoutBracket = KnockoutRound[];

// This will be used in useGameLogic.ts to set the word for a knockout match
export interface GameActionPayloads {
    'START_GAME': { gameStyle: GameStyle, maxWinners: number };
    'START_CLASSIC_MODE': { deck: Country[] };
    'NEXT_ROUND': { 
      nextCountry?: Country, 
      nextLetter?: string, 
      nextCategory?: AbcCategory, 
      availableAnswersCount?: number,
      nextWord?: string,
      nextWordCategory?: WordCategory,
    };
    'PROCESS_COMMENT': ChatMessage;
    'REGISTER_PLAYER': KnockoutPlayer;
    'FINISH_KNOCKOUT_MATCH': { winner: KnockoutPlayer };
    'SET_KNOCKOUT_WORD': { word: string; category: WordCategory };
}