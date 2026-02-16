import { GoogleGenAI, Modality, Part } from "@google/genai";
import { GEMINI_CHAT_MODEL, GEMINI_TTS_MODEL, SYSTEM_INSTRUCTION_CHAT, TTS_PREAMBLE } from "../constants";
import { TtsVoice } from "../types";

// Helper to get client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in process.env.API_KEY");
  return new GoogleGenAI({ apiKey });
};

// Chat
export const sendMessageToGemini = async (
  history: { role: string; parts: { text?: string; inlineData?: any }[] }[],
  newMessage: string,
  image?: string // base64
): Promise<string> => {
  try {
    const ai = getClient();
    
    // Convert history to match the API expected format
    const chat = ai.chats.create({
      model: GEMINI_CHAT_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CHAT,
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
    });

    const parts: Part[] = [{ text: newMessage }];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming jpeg for simplicity, can detect from base64 header
          data: image
        }
      });
    }

    // Use message parameter correctly as per guidelines
    const result = await chat.sendMessage({
      message: parts
    });

    return result.text || "";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

// TTS
export const generateSpeech = async (text: string, voice: TtsVoice): Promise<string> => {
  try {
    const ai = getClient();
    
    // Clean text: Remove markdown symbols roughly
    const cleanText = text
      .replace(/[#*`_~]/g, '') // remove common markdown chars
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim();

    const fullPrompt = `${TTS_PREAMBLE}\n\nText: ${cleanText}`;

    // Update contents structure to match array format in guidelines
    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [{
        parts: [{ text: fullPrompt }]
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio data returned");
    
    return audioData;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};