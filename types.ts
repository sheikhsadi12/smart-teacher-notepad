export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  timestamp: number;
  isLoading?: boolean;
}

export enum TtsVoice {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface TtsState {
  isPlaying: boolean;
  isLoading: boolean;
  speed: number;
  voice: TtsVoice;
  textToRead: string;
}

export interface QuickAction {
  label: string;
  prompt: string;
  icon: string;
}