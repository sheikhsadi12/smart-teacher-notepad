import { TtsVoice, QuickAction } from './types';

export const GEMINI_CHAT_MODEL = 'gemini-3-flash-preview';
export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export const SYSTEM_INSTRUCTION_CHAT = `
You are a highly intelligent, bilingual (English and Bangla) teacher's assistant.
Your goal is to help teachers and students by explaining concepts clearly, solving math problems, checking grammar, and summarizing notes.
- Respond in Markdown.
- Use KaTeX for math equations (e.g., $E=mc^2$).
- Be encouraging and pedagogical.
- When asked to explain in Bangla, use natural, fluent Bangla.
`;

export const TTS_PREAMBLE = "Read the following text naturally and fluently. Maintain smooth flow between English and Bangla. No robotic pauses.";

export const AVAILABLE_VOICES: TtsVoice[] = [
  TtsVoice.Kore,
  TtsVoice.Puck,
  TtsVoice.Charon,
  TtsVoice.Fenrir,
  TtsVoice.Zephyr
];

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Summarize', prompt: 'Summarize this note concisely.', icon: 'fa-compress-alt' },
  { label: 'Explain (Bangla)', prompt: 'Explain the key concepts of this note in fluent Bangla.', icon: 'fa-language' },
  { label: 'Grammar Check', prompt: 'Check the grammar and spelling of this note. List corrections.', icon: 'fa-spell-check' },
  { label: 'Generate MCQ', prompt: 'Generate 5 multiple-choice questions based on this note with answers.', icon: 'fa-list-ol' },
];