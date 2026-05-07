import { apiFetch } from './api';

export interface IngestionJob {
    id: number;
    source_name: string;
    started_at: string;
    completed_at: string | null;
    status: 'running' | 'success' | 'failed';
    cves_processed: number;
    cves_added: number;
    cves_updated: number;
    error_message: string | null;
}

export interface SourceStatus {
    name: string;
    cve_count: number;
    last_success: string | null;
}

export const ingestionApi = {
    // Trigger ingestion for a specific source
    runIngestion: async (source: string) => {
        const response = await apiFetch(`/api/v1/ingestion/run/${source}`, {
            method: 'POST',
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ingestion failed (${response.status}): ${text}`);
        }
        return response.json();
    },

    // Get status summary of all sources
    getSourcesStatus: async (): Promise<SourceStatus[]> => {
        const response = await apiFetch('/api/v1/ingestion/sources');
        if (!response.ok) return [];
        return response.json();
    },

    // Get recent ingestion jobs history
    getRecentJobs: async (limit: number = 10): Promise<IngestionJob[]> => {
        const response = await apiFetch(`/api/v1/ingestion/jobs?limit=${limit}`);
        if (!response.ok) return [];
        return response.json();
    },
};
