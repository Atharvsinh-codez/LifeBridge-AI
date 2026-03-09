import { R2StorageService } from './r2-storage';

// ─── PCM to WAV conversion (exact LangoWorld implementation) ───

function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  channels: number = 1,
  bitsPerSample: number = 16,
): Buffer {
  const length = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + length);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      buffer[offset + i] = str.charCodeAt(i);
    }
  };
  const writeUInt32LE = (offset: number, value: number) => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
    buffer[offset + 2] = (value >> 16) & 0xff;
    buffer[offset + 3] = (value >> 24) & 0xff;
  };
  const writeUInt16LE = (offset: number, value: number) => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
  };

  writeString(0, 'RIFF');
  writeUInt32LE(4, 36 + length);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  writeUInt32LE(16, 16);
  writeUInt16LE(20, 1);
  writeUInt16LE(22, channels);
  writeUInt32LE(24, sampleRate);
  writeUInt32LE(28, (sampleRate * channels * bitsPerSample) / 8);
  writeUInt16LE(32, (channels * bitsPerSample) / 8);
  writeUInt16LE(34, bitsPerSample);
  writeString(36, 'data');
  writeUInt32LE(40, length);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

// ─── Gemini TTS via raw REST API (exact LangoWorld approach) ───

async function generateTTSWithGemini(
  text: string,
  apiKey: string,
  model: string,
  retryCount = 0,
  maxRetries = 3,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`[TTS] Calling Gemini TTS API... (attempt ${retryCount + 1}/${maxRetries + 1})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();

      // Retry on 429, 500, 503 with exponential backoff
      if ((response.status === 429 || response.status === 500 || response.status === 503) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[TTS] Gemini ${response.status} error, retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return generateTTSWithGemini(text, apiKey, model, retryCount + 1, maxRetries);
      }

      throw new Error(`Gemini TTS API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content) {
      console.error('[TTS] Invalid Gemini response:', JSON.stringify(data).substring(0, 500));
      if (retryCount < maxRetries) {
        console.log('[TTS] Retrying...');
        return generateTTSWithGemini(text, apiKey, model, retryCount + 1, maxRetries);
      }
      throw new Error('Invalid response format from Gemini TTS API');
    }

    const audioPart = data.candidates[0].content.parts.find(
      (part: any) => part.inlineData && part.inlineData.mimeType?.startsWith('audio/'),
    );

    if (!audioPart?.inlineData) {
      console.error('[TTS] No audio part in response');
      if (retryCount < maxRetries) {
        return generateTTSWithGemini(text, apiKey, model, retryCount + 1, maxRetries);
      }
      throw new Error('No audio data in response');
    }

    const mimeType = audioPart.inlineData.mimeType || 'audio/mpeg';
    const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
    console.log(`[TTS] Received audio: ${mimeType}, ${audioBuffer.length} bytes`);

    return { buffer: audioBuffer, mimeType };
  } catch (error) {
    console.error('[TTS] Gemini error:', error);
    throw error;
  }
}

// ─── Generate audio with PCM→WAV handling ───

async function generateAudioForText(
  text: string,
  apiKey: string,
  model: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const result = await generateTTSWithGemini(text, apiKey, model);
  let audioBuffer = result.buffer;
  let mimeType = result.mimeType;

  // Convert PCM/L16 to WAV
  if (mimeType.includes('L16') || mimeType.includes('pcm')) {
    let sampleRate = 24000;
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch) sampleRate = parseInt(rateMatch[1], 10);
    console.log(`[TTS] Converting PCM to WAV (sample rate: ${sampleRate}Hz)`);
    audioBuffer = pcmToWav(result.buffer, sampleRate);
    mimeType = 'audio/wav';
  }

  console.log(`[TTS] Final audio: ${mimeType}, ${audioBuffer.length} bytes`);
  return { buffer: audioBuffer, mimeType };
}

// ─── Voice Service (orchestrates TTS + R2 caching) ───

export class VoiceService {
  private readonly apiKey: string | undefined;

  constructor(
    apiKey: string | undefined,
    private readonly model: string,
    private readonly r2: R2StorageService,
  ) {
    this.apiKey = apiKey;
    if (!apiKey) {
      console.warn('[VoiceService] No GEMINI_API_KEY — TTS disabled');
    } else {
      console.log(`[VoiceService] Initialized: model=${model}, r2=${r2.isConfigured ? 'enabled' : 'disabled'}`);
    }
  }

  async synthesize(
    text: string,
    targetLocale: string,
  ): Promise<{
    audioBase64: string | null;
    audioMimeType: string | null;
    audioUrl: string | null;
  }> {
    if (!this.apiKey) {
      return { audioBase64: null, audioMimeType: null, audioUrl: null };
    }

    // Step 1: Compute deterministic hash
    const textHash = this.r2.computeTextHash(text);
    const r2Key = this.r2.getAudioKey(textHash, targetLocale);
    console.log(`[VoiceService] TTS request: text="${text.substring(0, 60)}..." lang=${targetLocale} hash=${textHash}`);

    // Step 2: Check R2 cache
    if (this.r2.isConfigured) {
      const cachedUrl = await this.r2.checkExists(r2Key);
      if (cachedUrl) {
        console.log(`[VoiceService] ✓ Cache HIT: ${cachedUrl}`);
        return { audioBase64: null, audioMimeType: null, audioUrl: cachedUrl };
      }
      console.log('[VoiceService] ✗ Cache MISS — generating audio...');
    }

    // Step 3: Generate audio via Gemini TTS
    try {
      const { buffer: audioBuffer, mimeType } = await generateAudioForText(text, this.apiKey, this.model);
      const base64 = audioBuffer.toString('base64');

      // Step 4: Upload to R2 (non-blocking)
      let audioUrl: string | null = null;
      if (this.r2.isConfigured) {
        try {
          audioUrl = await this.r2.upload(r2Key, audioBuffer, mimeType);
          console.log(`[VoiceService] ✓ Stored to R2: ${audioUrl}`);
        } catch (uploadError) {
          console.error('[VoiceService] R2 upload failed:', uploadError);
          // Audio still available as base64 even if R2 fails
        }
      }

      return { audioBase64: base64, audioMimeType: mimeType, audioUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[VoiceService] TTS FAILED: ${message}`);
      return { audioBase64: null, audioMimeType: null, audioUrl: null };
    }
  }
}
