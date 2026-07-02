import { store as projectStore } from '@/routes/projects';
import type { ServerProject } from '@/types/scene';

function csrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export type CreateProjectInput = {
    name: string;
    client?: string | null;
    projectNumber?: string | null;
};

/** Create a project via fetch and return the persisted record (with its slug). */
export async function createProject(
    teamSlug: string,
    input: CreateProjectInput,
): Promise<ServerProject> {
    const { url } = projectStore({ current_team: teamSlug });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            name: input.name,
            client: input.client ?? null,
            project_number: input.projectNumber ?? null,
        }),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
            message?: string;
        } | null;

        throw new Error(payload?.message ?? 'Could not create the project.');
    }

    return response.json() as Promise<ServerProject>;
}
