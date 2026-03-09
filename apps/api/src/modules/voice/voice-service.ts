import { GoogleGenAI } from '@google/genai';
import { R2StorageService } from './r2-storage';

function voiceNameForLocale(locale: string): string {
  const map: Record<string, string> = {
    hi: 'Kore', ja: 'Charon', es: 'Leda', fr: 'Leda', de: 'Kore',
    ko: 'Charon', ar: 'Puck', pt: 'Leda', ru: 'Kore', it: 'Leda',
    zh: 'Charon', tr: 'Puck', vi: 'Charon', th: 'Charon', bn: 'Kore',
    ta: 'Kore', te: 'Kore', mr: 'Kore', gu: 'Kore', ur: 'Kore',
  };
  return map[locale.slice(0, 2).toLowerCase()] ?? 'Aoede';
}

export class VoiceService {
  private readonly client: GoogleGenAI | null;

  constructor(
    apiKey: string | undefined,
    private readonly model: string,
    private readonly r2: R2StorageService,
  ) {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    if (!apiKey) {
      console.warn('[VoiceService] No GEMINI_API_KEY — TTS disabled');
    } else {
      console.log(`[VoiceService] Initialized: model=${model}, r2=${r2.isConfigured ? 'enabled' : 'disabled'}`);
    }
  }

  async synthesize(text: string, targetLocale: string): Promise<{
    audioBase64: string | null;
    audioMimeType: string | null;
    audioUrl: string | null;
  }> {
    if (!this.client) {
      return { audioBase64: null, audioMimeType: null, audioUrl: null };
    }

    const voiceName = voiceNameForLocale(targetLocale);
    const cacheKey = this.r2.generateKey(text, targetLocale, voiceName);

    // Check R2 cache first
    if (this.r2.isConfigured) {
      const cached = await this.r2.exists(cacheKey);
      if (cached) {
        const url = this.r2.getPublicUrl(cacheKey, 'audio/wav');
        console.log(`[VoiceService] Cache HIT: ${url}`);
        return { audioBase64: null, audioMimeType: null, audioUrl: url };
      }
    }

    try {
      console.log(`[VoiceService] TTS: model=${this.model}, voice=${voiceName}, locale=${targetLocale}`);

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: `Say the following text naturally: ${text}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        (part) => 'inlineData' in part && part.inlineData,
      );

      if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData) {
        console.warn('[VoiceService] No audio in response');
        return { audioBase64: null, audioMimeType: null, audioUrl: null };
      }

      const base64 = audioPart.inlineData.data ?? '';
      const mime = audioPart.inlineData.mimeType ?? 'audio/wav';

      // Upload to R2 in background (don't block response)
      if (this.r2.isConfigured && base64) {
        const buf = Buffer.from(base64, 'base64');
        this.r2.upload(cacheKey, buf, mime).catch((err) => {
          console.error('[VoiceService] R2 upload failed:', err);
        });
      }

      const audioUrl = this.r2.isConfigured
        ? this.r2.getPublicUrl(cacheKey, mime)
        : null;

      console.log(`[VoiceService] TTS success: ${mime}, ${base64.length} chars`);
      return { audioBase64: base64 || null, audioMimeType: mime, audioUrl };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Retry once on 429
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = message.match(/retryDelay":"?(\d+)/);
        const waitSecs = retryMatch ? Math.min(parseInt(retryMatch[1], 10), 30) : 25;
        console.warn(`[VoiceService] Rate limited — retrying in ${waitSecs}s...`);
        await new Promise((r) => setTimeout(r, waitSecs * 1000));

        try {
          const retryResp = await this.client.models.generateContent({
            model: this.model,
            contents: [{ role: 'user', parts: [{ text: `Say the following text naturally: ${text}` }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            },
          });
          const rp = retryResp.candidates?.[0]?.content?.parts?.find(
            (p) => 'inlineData' in p && p.inlineData,
          );
          if (rp && 'inlineData' in rp && rp.inlineData) {
            const b64 = rp.inlineData.data ?? '';
            const m = rp.inlineData.mimeType ?? 'audio/wav';
            if (this.r2.isConfigured && b64) {
              this.r2.upload(cacheKey, Buffer.from(b64, 'base64'), m).catch(() => { });
            }
            console.log('[VoiceService] TTS retry success');
            return {
              audioBase64: b64 || null,
              audioMimeType: m,
              audioUrl: this.r2.isConfigured ? this.r2.getPublicUrl(cacheKey, m) : null,
            };
          }
        } catch {
          console.error('[VoiceService] TTS retry also failed');
        }
      }

      console.error(`[VoiceService] TTS ERROR: ${message}`);
      return { audioBase64: null, audioMimeType: null, audioUrl: null };
    }
  }
}
