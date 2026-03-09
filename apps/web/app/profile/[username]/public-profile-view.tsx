'use client';

import { useEffect, useState } from 'react';
import { Heart, Phone, Shield, User } from 'lucide-react';

import { SectionCard, StatusBadge } from '@lifebridge/ui';

import { fetchPublicProfile } from '../../../lib/api-client';

interface PublicProfile {
    username: string;
    legalName: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    spokenLanguages?: string[];
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    chronicConditions?: string[];
    insuranceProvider?: string;
    insuranceId?: string;
    emergencyContacts?: Array<{ name: string; relationship: string; phone: string }>;
    notes?: string;
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="border-l-4 border-theme-black/10 py-1 pl-4">
            <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/50">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-theme-black">{value}</p>
        </div>
    );
}

export function PublicProfileView({ username }: { username: string }) {
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchPublicProfile(username);
                setProfile(data as PublicProfile);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Profile not found.');
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [username]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="font-pixel text-lg uppercase tracking-widest text-theme-black/50 animate-pulse">LOADING PROFILE...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <p className="font-pixel text-2xl text-theme-red uppercase">PROFILE NOT FOUND</p>
                <p className="font-mono text-sm text-theme-black/50">The username &quot;{username}&quot; does not exist or has no public profile.</p>
            </div>
        );
    }

    const contact = profile.emergencyContacts?.[0];

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Header */}
            <div className="border-4 border-theme-black bg-theme-white p-6 shadow-[8px_8px_0_var(--theme-red)]">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center border-2 border-theme-black bg-theme-red font-pixel text-2xl text-theme-white">
                        {profile.legalName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                        <h1 className="font-pixel text-3xl text-theme-black">{profile.legalName}</h1>
                        <p className="font-mono text-sm text-theme-black/50">@{profile.username}</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge tone="critical">EMERGENCY PROFILE</StatusBadge>
                    {profile.bloodType && <StatusBadge tone="warning">BLOOD: {profile.bloodType}</StatusBadge>}
                </div>
            </div>

            {/* Personal */}
            <SectionCard className="space-y-4 !p-6">
                <div className="flex items-center gap-3 border-b-2 border-theme-black pb-3">
                    <User className="h-5 w-5 text-theme-black" />
                    <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">PERSONAL</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <DataRow label="Date of Birth" value={profile.dateOfBirth} />
                    <DataRow label="Gender" value={profile.gender} />
                    <DataRow label="Nationality" value={profile.nationality} />
                    <DataRow label="Languages" value={profile.spokenLanguages?.join(', ')} />
                </div>
            </SectionCard>

            {/* Medical */}
            <SectionCard className="space-y-4 !p-6 !border-theme-red">
                <div className="flex items-center gap-3 border-b-2 border-theme-red pb-3">
                    <Heart className="h-5 w-5 text-theme-red" />
                    <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">MEDICAL</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <DataRow label="Blood Type" value={profile.bloodType} />
                    <DataRow label="Allergies" value={profile.allergies?.join(', ') || 'None reported'} />
                    <DataRow label="Medications" value={profile.medications?.join(', ') || 'None reported'} />
                    <DataRow label="Chronic Conditions" value={profile.chronicConditions?.join(', ') || 'None reported'} />
                </div>
            </SectionCard>

            {/* Insurance */}
            {(profile.insuranceProvider || profile.insuranceId) && (
                <SectionCard className="space-y-4 !p-6">
                    <div className="flex items-center gap-3 border-b-2 border-theme-black pb-3">
                        <Shield className="h-5 w-5 text-theme-black" />
                        <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">INSURANCE</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <DataRow label="Provider" value={profile.insuranceProvider} />
                        <DataRow label="Policy / Member ID" value={profile.insuranceId} />
                    </div>
                </SectionCard>
            )}

            {/* Emergency Contact */}
            {contact && (
                <SectionCard className="space-y-4 !p-6">
                    <div className="flex items-center gap-3 border-b-2 border-theme-black pb-3">
                        <Phone className="h-5 w-5 text-theme-black" />
                        <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">EMERGENCY CONTACT</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <DataRow label="Name" value={contact.name} />
                        <DataRow label="Relationship" value={contact.relationship} />
                        <DataRow label="Phone" value={contact.phone} />
                    </div>
                </SectionCard>
            )}

            {/* Notes */}
            {profile.notes && (
                <SectionCard className="space-y-4 !p-6">
                    <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">SPECIAL INSTRUCTIONS</p>
                    <p className="font-mono text-sm font-bold text-theme-black leading-relaxed">{profile.notes}</p>
                </SectionCard>
            )}
        </div>
    );
}
