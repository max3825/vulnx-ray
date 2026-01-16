import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'http://localhost:8000/api/v1';

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
        const response = await axios.post(`${API_BASE_URL}/ingestion/run/${source}`);
        return response.data;
    },

    // Get status summary of all sources
    getSourcesStatus: async (): Promise<SourceStatus[]> => {
        const response = await axios.get(`${API_BASE_URL}/ingestion/sources`);
        return response.data;
    },

    // Get recent ingestion jobs history
    getRecentJobs: async (limit: number = 10): Promise<IngestionJob[]> => {
        const response = await axios.get(`${API_BASE_URL}/ingestion/jobs?limit=${limit}`);
        return response.data;
    }
};
