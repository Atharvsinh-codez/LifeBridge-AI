'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

import { SectionCard, StatusBadge } from '@lifebridge/ui';

import { fetchProfile, saveProfile } from '../../lib/api-client';

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const SPOKEN_LANGUAGES = [
  'English', 'Spanish', 'Hindi', 'French', 'German', 'Japanese', 'Chinese',
  'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian', 'Dutch', 'Turkish',
  'Vietnamese', 'Thai', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Urdu',
];

interface ProfileForm {
  username: string;
  legalName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  spokenLanguages: string;
  bloodType: string;
  allergies: string;
  medications: string;
  chronicConditions: string;
  insuranceProvider: string;
  insuranceId: string;
  primaryContactName: string;
  primaryContactRelationship: string;
  primaryContactPhone: string;
  notes: string;
}

const emptyProfile: ProfileForm = {
  username: '',
  legalName: '',
  dateOfBirth: '',
  gender: '',
  nationality: '',
  spokenLanguages: '',
  bloodType: '',
  allergies: '',
  medications: '',
  chronicConditions: '',
  insuranceProvider: '',
  insuranceId: '',
  primaryContactName: '',
  primaryContactRelationship: '',
  primaryContactPhone: '',
  notes: '',
};

export function ProfileForm() {
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const shareUrl = form.username
    ? `${window.location.origin}/profile/${form.username}`
    : '';

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setStatus('loading');
      try {
        const data = await fetchProfile();
        if (!isMounted || !data) {
          setStatus('idle');
          return;
        }

        const profile = data as Record<string, unknown>;

        setForm({
          username: (profile.username as string) ?? '',
          legalName: (profile.legalName as string) ?? '',
          dateOfBirth: (profile.dateOfBirth as string) ?? '',
          gender: (profile.gender as string) ?? '',
          nationality: (profile.nationality as string) ?? '',
          spokenLanguages: Array.isArray(profile.spokenLanguages) ? (profile.spokenLanguages as string[]).join(', ') : '',
          bloodType: (profile.bloodType as string) ?? '',
          allergies: Array.isArray(profile.allergies) ? (profile.allergies as string[]).join(', ') : '',
          medications: Array.isArray(profile.medications) ? (profile.medications as string[]).join(', ') : '',
          chronicConditions: Array.isArray(profile.chronicConditions) ? (profile.chronicConditions as string[]).join(', ') : '',
          insuranceProvider: (profile.insuranceProvider as string) ?? '',
          insuranceId: (profile.insuranceId as string) ?? '',
          primaryContactName: Array.isArray(profile.emergencyContacts) && (profile.emergencyContacts as Array<Record<string, string>>)[0]?.name || '',
          primaryContactRelationship: Array.isArray(profile.emergencyContacts) && (profile.emergencyContacts as Array<Record<string, string>>)[0]?.relationship || '',
          primaryContactPhone: Array.isArray(profile.emergencyContacts) && (profile.emergencyContacts as Array<Record<string, string>>)[0]?.phone || '',
          notes: (profile.notes as string) ?? '',
        });
        setStatus('idle');
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to load profile.');
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');

    try {
      await saveProfile({
        username: form.username || null,
        legalName: form.legalName,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        spokenLanguages: form.spokenLanguages.split(',').map((s) => s.trim()).filter(Boolean),
        bloodType: form.bloodType || null,
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        medications: form.medications.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: form.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
        insuranceProvider: form.insuranceProvider || null,
        insuranceId: form.insuranceId || null,
        emergencyContacts: form.primaryContactName
          ? [{
            name: form.primaryContactName,
            relationship: form.primaryContactRelationship || 'Primary contact',
            phone: form.primaryContactPhone,
          }]
          : [],
        notes: form.notes || null,
      });
      setStatus('saved');
      setMessage('Emergency profile saved successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save profile.');
    }
  }

  function updateField(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function copyShareLink() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Shareable Link Banner */}
      {form.username && (
        <div className="border-4 border-theme-red bg-theme-red/5 p-5 shadow-[6px_6px_0_var(--theme-red)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">SHAREABLE EMERGENCY PROFILE</p>
              <p className="mt-1 font-mono text-sm font-bold text-theme-black break-all">{shareUrl}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={copyShareLink}
                className="flex items-center gap-2 border-2 border-theme-black bg-theme-white px-4 py-2 font-pixel text-[10px] uppercase tracking-widest text-theme-black transition-all hover:bg-theme-black hover:text-theme-white"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'COPIED' : 'COPY LINK'}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border-2 border-theme-black bg-theme-black px-4 py-2 font-pixel text-[10px] uppercase tracking-widest text-theme-white transition-all hover:bg-theme-red"
              >
                <ExternalLink className="h-4 w-4" />
                VIEW
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Personal Info */}
      <SectionCard className="space-y-6 !p-8">
        <div className="flex items-center gap-4">
          <StatusBadge tone="neutral">IDENTITY</StatusBadge>
          <StatusBadge tone={status === 'saved' ? 'success' : status === 'error' ? 'critical' : 'neutral'}>
            {status.toUpperCase()}
          </StatusBadge>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">
              USERNAME <span className="text-theme-red">(for shareable link)</span>
            </span>
            <input
              value={form.username}
              onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="e.g. john_doe"
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">LEGAL NAME</span>
            <input
              value={form.legalName}
              onChange={(e) => updateField('legalName', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">DATE OF BIRTH</span>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">GENDER</span>
            <select
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">NATIONALITY</span>
            <input
              value={form.nationality}
              onChange={(e) => updateField('nationality', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">SPOKEN LANGUAGES</span>
            <input
              value={form.spokenLanguages}
              onChange={(e) => updateField('spokenLanguages', e.target.value)}
              placeholder="English, Hindi, Spanish"
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
        </div>
      </SectionCard>

      {/* Medical Info */}
      <SectionCard className="space-y-6 !p-8">
        <StatusBadge tone="critical">MEDICAL DATA</StatusBadge>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">BLOOD TYPE</span>
            <select
              value={form.bloodType}
              onChange={(e) => updateField('bloodType', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt || 'Select'}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">ALLERGIES</span>
            <input
              value={form.allergies}
              onChange={(e) => updateField('allergies', e.target.value)}
              placeholder="Penicillin, Nuts, Latex"
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">MEDICATIONS</span>
            <input
              value={form.medications}
              onChange={(e) => updateField('medications', e.target.value)}
              placeholder="Insulin, Aspirin"
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">CHRONIC CONDITIONS</span>
            <input
              value={form.chronicConditions}
              onChange={(e) => updateField('chronicConditions', e.target.value)}
              placeholder="Diabetes, Asthma"
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
        </div>
      </SectionCard>

      {/* Insurance */}
      <SectionCard className="space-y-6 !p-8">
        <StatusBadge tone="warning">INSURANCE</StatusBadge>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">INSURANCE PROVIDER</span>
            <input
              value={form.insuranceProvider}
              onChange={(e) => updateField('insuranceProvider', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">POLICY / MEMBER ID</span>
            <input
              value={form.insuranceId}
              onChange={(e) => updateField('insuranceId', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
        </div>
      </SectionCard>

      {/* Emergency Contact */}
      <SectionCard className="space-y-6 !p-8">
        <StatusBadge tone="success">EMERGENCY CONTACT</StatusBadge>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">CONTACT NAME</span>
            <input
              value={form.primaryContactName}
              onChange={(e) => updateField('primaryContactName', e.target.value)}
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">RELATIONSHIP</span>
            <input
              value={form.primaryContactRelationship}
              onChange={(e) => updateField('primaryContactRelationship', e.target.value)}
              placeholder="Spouse, Parent, etc."
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
          <label className="space-y-2">
            <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">PHONE NUMBER</span>
            <input
              value={form.primaryContactPhone}
              onChange={(e) => updateField('primaryContactPhone', e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
            />
          </label>
        </div>
      </SectionCard>

      {/* Notes + Save */}
      <SectionCard className="space-y-6 !p-8">
        <StatusBadge tone="neutral">ADDITIONAL NOTES</StatusBadge>

        <label className="space-y-2">
          <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">
            SPECIAL INSTRUCTIONS FOR RESPONDERS
          </span>
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any other critical information responders should know..."
            className="min-h-28 w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-theme-black outline-none placeholder:text-theme-black/30 focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
          />
        </label>

        <div className="flex flex-col-reverse items-start justify-between gap-6 pt-2 md:flex-row md:items-center">
          <p className="font-mono text-xs font-semibold text-theme-black/50">
            {message ? (
              <span className={status === 'error' ? 'text-theme-red' : 'text-green-600'}>[{message}]</span>
            ) : (
              'SEPARATE MULTIPLE ITEMS WITH COMMAS'
            )}
          </p>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full border-2 border-theme-black bg-theme-black px-8 py-4 font-pixel text-sm uppercase tracking-widest text-theme-white shadow-[4px_4px_0_var(--theme-red)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-red)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 md:w-auto"
          >
            {status === 'loading' ? 'SAVING...' : 'SAVE EMERGENCY PROFILE'}
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
