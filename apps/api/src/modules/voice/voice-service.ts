import { GoogleGenAI } from '@google/genai';

function voiceNameForLocale(locale: string): string {
  const map: Record<string, string> = {
    hi: 'Kore',
    ja: 'Charon',
    es: 'Leda',
    fr: 'Leda',
    de: 'Kore',
    ko: 'Charon',
    ar: 'Puck',
    pt: 'Leda',
    ru: 'Kore',
    it: 'Leda',
    zh: 'Charon',
    tr: 'Puck',
    vi: 'Charon',
    th: 'Charon',
    bn: 'Kore',
    ta: 'Kore',
    te: 'Kore',
    mr: 'Kore',
    gu: 'Kore',
    ur: 'Kore',
  };

  const prefix = locale.slice(0, 2).toLowerCase();
  return map[prefix] ?? 'Aoede';
}

export class VoiceService {
  private readonly client: GoogleGenAI | null;

  constructor(
    apiKey: string | undefined,
    private readonly model: string,
  ) {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    if (!apiKey) {
      console.warn('[VoiceService] No GEMINI_API_KEY — TTS disabled');
    } else {
      console.log(`[VoiceService] Initialized with model: ${model}`);
    }
  }

  async synthesize(text: string, targetLocale: string) {
    if (!this.client) {
      console.warn('[VoiceService] No client — skipping TTS');
      return { audioBase64: null, audioMimeType: null };
    }

    const voiceName = voiceNameForLocale(targetLocale);

    try {
      console.log(`[VoiceService] Requesting TTS: model=${this.model}, voice=${voiceName}, locale=${targetLocale}, text="${text.slice(0, 50)}..."`);

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: `Say the following text naturally: ${text}` }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(
        (part) => 'inlineData' in part && part.inlineData,
      );

      if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData) {
        console.warn('[VoiceService] No audio in response. Response:', JSON.stringify(response).slice(0, 500));
        return { audioBase64: null, audioMimeType: null };
      }

      console.log(`[VoiceService] TTS success: ${audioPart.inlineData.mimeType}, ${(audioPart.inlineData.data?.length ?? 0)} bytes`);

      return {
        audioBase64: audioPart.inlineData.data ?? null,
        audioMimeType: audioPart.inlineData.mimeType ?? 'audio/wav',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Retry once on 429 rate-limit (extract retry delay from error)
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = message.match(/retryDelay":"?(\d+)/);
        const waitSecs = retryMatch ? Math.min(parseInt(retryMatch[1], 10), 30) : 25;
        console.warn(`[VoiceService] Rate limited — retrying in ${waitSecs}s...`);

        await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));

        try {
          const retryResponse = await this.client.models.generateContent({
            model: this.model,
            contents: [
              {
                role: 'user',
                parts: [{ text: `Say the following text naturally: ${text}` }],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });

          const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
            (part) => 'inlineData' in part && part.inlineData,
          );

          if (retryPart && 'inlineData' in retryPart && retryPart.inlineData) {
            console.log(`[VoiceService] TTS retry success`);
            return {
              audioBase64: retryPart.inlineData.data ?? null,
              audioMimeType: retryPart.inlineData.mimeType ?? 'audio/wav',
            };
          }
        } catch (retryError) {
          console.error(`[VoiceService] TTS retry also failed`);
        }
      }

      console.error(`[VoiceService] TTS ERROR: ${message}`);
      return { audioBase64: null, audioMimeType: null };
    }
  }
}
