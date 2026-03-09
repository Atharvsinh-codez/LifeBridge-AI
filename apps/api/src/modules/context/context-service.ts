import { GoogleGenAI } from '@google/genai';
import { assessEmergencyText, normalizeEmergencyText } from '@lifebridge/emergency-knowledge';
import { CONTEXT_INTELLIGENCE_SYSTEM_PROMPT } from '@lifebridge/prompts';
import { contextAssessmentSchema } from '@lifebridge/shared';

export class ContextService {
  private readonly client: GoogleGenAI | null;

  constructor(
    apiKey: string | undefined,
    private readonly model: string,
  ) {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async analyze(text: string) {
    const normalizedText = normalizeEmergencyText(text);
    const heuristic = assessEmergencyText(normalizedText);

    if (!this.client) {
      return {
        normalizedText,
        assessment: heuristic,
      };
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: JSON.stringify({
          originalText: text,
          normalizedText,
          heuristic,
        }),
        config: {
          responseMimeType: 'application/json',
          systemInstruction: CONTEXT_INTELLIGENCE_SYSTEM_PROMPT,
        },
      });

      const parsed = contextAssessmentSchema.partial().safeParse(JSON.parse(response.text ?? '{}'));
      if (!parsed.success) {
        return {
          normalizedText,
          assessment: heuristic,
        };
      }

      return {
        normalizedText,
        assessment: {
          ...heuristic,
          ...parsed.data,
          medicalContext: parsed.data.medicalContext ?? heuristic.medicalContext,
          matchedSignals: parsed.data.matchedSignals ?? heuristic.matchedSignals,
        },
      };
    } catch {
      return {
        normalizedText,
        assessment: heuristic,
      };
    }
  }
}

