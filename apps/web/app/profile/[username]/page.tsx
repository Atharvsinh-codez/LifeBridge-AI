import { PageShell } from '../../../components/page-shell';
import { PublicProfileView } from './public-profile-view';

interface PublicProfilePageProps {
    params: { username: string };
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
    return (
        <PageShell>
            <PublicProfileView username={params.username} />
        </PageShell>
    );
}
