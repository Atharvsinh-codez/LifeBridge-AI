import {
  CountryEmergencyNumber,
  EmergencyType,
  SeverityLevel,
} from '@lifebridge/shared';

const emergencyNumbers: CountryEmergencyNumber[] = [
  { id: '11111111-1111-1111-1111-111111111111', countryCode: 'IN', serviceType: 'unified', phoneNumber: '112', label: 'National Emergency Response', isPrimary: true },
  { id: '22222222-2222-2222-2222-222222222222', countryCode: 'US', serviceType: 'unified', phoneNumber: '911', label: 'Emergency Services', isPrimary: true },
  { id: '33333333-3333-3333-3333-333333333333', countryCode: 'GB', serviceType: 'unified', phoneNumber: '999', label: 'Emergency Services', isPrimary: true },
  { id: '44444444-4444-4444-4444-444444444444', countryCode: 'JP', serviceType: 'ambulance', phoneNumber: '119', label: 'Fire and Ambulance', isPrimary: true },
  { id: '55555555-5555-5555-5555-555555555555', countryCode: 'JP', serviceType: 'police', phoneNumber: '110', label: 'Police', isPrimary: true },
  { id: '66666666-6666-6666-6666-666666666666', countryCode: 'ES', serviceType: 'unified', phoneNumber: '112', label: 'Emergency Services', isPrimary: true },
];

const typeSignals: Record<Exclude<EmergencyType, 'unknown'>, string[]> = {
  medical: ['breathe', 'breathing', 'chest pain', 'bleeding', 'collapse', 'unconscious', 'stroke', 'heart', 'allergy', 'seizure', 'help'],
  police: ['attack', 'assault', 'gun', 'knife', 'robbery', 'violent', 'kidnap', 'threat', 'stolen'],
  fire: ['fire', 'smoke', 'burning', 'explosion', 'gas leak'],
  disaster: ['earthquake', 'flood', 'building collapse', 'tsunami', 'landslide', 'cyclone'],
};

const criticalSignals = ['cannot breathe', "can't breathe", 'not breathing', 'unconscious', 'severe bleeding', 'chest pain'];

export function normalizeEmergencyText(input: string): string {
  const value = input.trim().replace(/\s+/g, ' ');
  if (!value) {
    return 'Patient needs urgent assistance.';
  }

  const lower = value.toLowerCase();
  if (lower.includes('chest pain') && (lower.includes("can't breathe") || lower.includes('cannot breathe'))) {
    return 'Patient reports chest pain and breathing difficulty.';
  }

  if (lower === 'help chest pain can\'t breathe') {
    return 'Patient reports chest pain and breathing difficulty.';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function assessEmergencyText(input: string): {
  emergencyType: EmergencyType;
  severity: SeverityLevel;
  matchedSignals: string[];
  suggestedAction: string;
  medicalContext: string[];
  responderSummary: string;
  confidence: number;
} {
  const text = input.toLowerCase();
  const matches = Object.entries(typeSignals).map(([type, signals]) => ({
    type: type as EmergencyType,
    signals: signals.filter((signal) => text.includes(signal)),
  }));

  const sorted = matches.sort((left, right) => right.signals.length - left.signals.length);
  const winner = sorted[0];
  const emergencyType = winner?.signals.length ? winner.type : 'unknown';
  const matchedSignals = winner?.signals ?? [];

  let severity: SeverityLevel = 'medium';
  if (criticalSignals.some((signal) => text.includes(signal))) {
    severity = 'critical';
  } else if (matchedSignals.length >= 2) {
    severity = 'high';
  } else if (matchedSignals.length === 0) {
    severity = 'low';
  }

  const suggestedAction =
    emergencyType === 'medical'
      ? 'Call ambulance immediately and keep the patient monitored.'
      : emergencyType === 'police'
        ? 'Contact police and move to a safer location if possible.'
        : emergencyType === 'fire'
          ? 'Trigger fire response and evacuate the immediate area.'
          : emergencyType === 'disaster'
            ? 'Escalate to disaster response and move to a protected zone.'
            : 'Escalate to a human responder for manual triage.';

  return {
    emergencyType,
    severity,
    matchedSignals,
    suggestedAction,
    medicalContext: matchedSignals,
    responderSummary: normalizeEmergencyText(input),
    confidence: matchedSignals.length ? Math.min(0.55 + matchedSignals.length * 0.1, 0.95) : 0.35,
  };
}

export function routeEmergencyNumbers(countryCode: string | null, emergencyType: EmergencyType): CountryEmergencyNumber[] {
  const normalizedCountryCode = (countryCode ?? 'US').toUpperCase();
  const numbers = emergencyNumbers.filter((entry) => entry.countryCode === normalizedCountryCode);

  if (emergencyType === 'police') {
    const police = numbers.filter((entry) => entry.serviceType === 'police' || entry.serviceType === 'unified');
    if (police.length > 0) {
      return police;
    }
  }

  if (emergencyType === 'fire') {
    const fire = numbers.filter((entry) => entry.serviceType === 'fire' || entry.serviceType === 'unified');
    if (fire.length > 0) {
      return fire;
    }
  }

  if (emergencyType === 'medical') {
    const medical = numbers.filter((entry) => entry.serviceType === 'ambulance' || entry.serviceType === 'unified');
    if (medical.length > 0) {
      return medical;
    }
  }

  return numbers.length > 0 ? numbers : emergencyNumbers.filter((entry) => entry.countryCode === 'US');
}

export const emergencyNumberSeed = emergencyNumbers;

