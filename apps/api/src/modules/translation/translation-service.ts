const LINGO_API_BASE = 'https://api.lingo.dev';

interface LocalizeResponse {
  sourceLocale: string;
  targetLocale: string;
  data: Record<string, string>;
}

interface RecognizeResponse {
  locale: string;
  language: string;
  region: string | null;
  script: string | null;
  label: string;
  direction: 'ltr' | 'rtl';
}

export class TranslationService {
  private readonly apiKey: string | undefined;
  private readonly engineId: string | undefined;

  constructor(apiKey?: string, engineId?: string) {
    this.apiKey = apiKey;
    this.engineId = engineId;
  }

  async detectLocale(text: string): Promise<string> {
    if (!this.apiKey) {
      return 'en';
    }

    try {
      const response = await fetch(`${LINGO_API_BASE}/process/recognize`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          labelLocale: 'en',
        }),
      });

      if (!response.ok) {
        return 'en';
      }

      const result = (await response.json()) as RecognizeResponse;
      return result.locale ?? 'en';
    } catch {
      return 'en';
    }
  }

  async translateText(text: string, sourceLocale: string, targetLocale: string): Promise<string> {
    if (sourceLocale === targetLocale) {
      return text;
    }

    if (!this.apiKey || !this.engineId) {
      return `[${targetLocale.toUpperCase()}] ${text}`;
    }

    try {
      const response = await fetch(`${LINGO_API_BASE}/process/localize`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engineId: this.engineId,
          sourceLocale,
          targetLocale,
          data: {
            text,
          },
        }),
      });

      if (!response.ok) {
        return `[${targetLocale.toUpperCase()}] ${text}`;
      }

      const result = (await response.json()) as LocalizeResponse;
      return result.data?.text ?? `[${targetLocale.toUpperCase()}] ${text}`;
    } catch {
      return `[${targetLocale.toUpperCase()}] ${text}`;
    }
  }
}
