'use client';

type BrowserSpeechRecognitionAlternative = {
  readonly transcript: string;
};

type BrowserSpeechRecognitionResult = {
  readonly 0: BrowserSpeechRecognitionAlternative;
  readonly isFinal: boolean;
  readonly length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  readonly results: {
    readonly 0: BrowserSpeechRecognitionResult;
    readonly length: number;
  };
};

type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

export function createSpeechRecognition(locale: string) {
  const SpeechRecognitionImpl =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  if (!SpeechRecognitionImpl) {
    return null;
  }

  const recognition = new SpeechRecognitionImpl();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = locale;

  return recognition;
}
