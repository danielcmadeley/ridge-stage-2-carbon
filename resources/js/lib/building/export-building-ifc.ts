import type { Team } from '@/types';
import type { BuildingDraft } from '@/types/custom-building';

export type BuildingIfcExportOptions = {
    name?: string;
};

function csrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export function buildingIfcFilename(draft: BuildingDraft): string {
    const { span, buildingLength } = draft.portalFrame;

    return `portal-frame-${span}x${buildingLength}.ifc`;
}

export async function exportBuildingToIfc(
    teamSlug: Team['slug'],
    draft: BuildingDraft,
    options: BuildingIfcExportOptions = {},
): Promise<Blob> {
    const response = await fetch(`/${teamSlug}/export-ifc`, {
        method: 'POST',
        headers: {
            Accept: 'application/x-step',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            ...draft.portalFrame,
            rotation: draft.rotation,
            name: options.name,
        }),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
            message?: string;
        } | null;

        throw new Error(
            payload?.message ?? 'Could not export this building as IFC.',
        );
    }

    return response.blob();
}

export function downloadBuildingIfc(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

export async function exportAndDownloadBuildingIfc(
    teamSlug: Team['slug'],
    draft: BuildingDraft,
    options: BuildingIfcExportOptions = {},
): Promise<void> {
    const blob = await exportBuildingToIfc(teamSlug, draft, options);
    downloadBuildingIfc(blob, buildingIfcFilename(draft));
}
