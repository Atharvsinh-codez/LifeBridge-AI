import { PageShell } from '../../components/page-shell';
import { ProfileForm } from '../../features/dashboard/profile-form';

export default function ProfilePage() {
  return (
    <PageShell>
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">PROFILE DASHBOARD</p>
          <h1 className="font-pixel text-4xl leading-tight text-theme-black md:text-5xl">
            UNIVERSAL EMERGENCY PROFILE
          </h1>
          <p className="font-mono text-sm leading-relaxed text-theme-black/70">
            Store the data that responders need most: allergies, medications, chronic conditions, and emergency contacts, ready to be translated during an incident.
          </p>
        </div>

        <ProfileForm />
      </div>
    </PageShell>
  );
}
