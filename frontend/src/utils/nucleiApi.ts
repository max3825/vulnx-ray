/**
 * API Client for VulnX-Ray Nuclei Scanner Backend
 */

import axios from 'axios';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface NucleiScanRequest {
    target_url: string;
    severity?: SeverityLevel[];
    tags?: string[];
}

export interface NucleiScanResponse {
    scan_id: string;
    status: string;
    command: string;
    output_folder: string;
    started_at: string;
}

export interface NucleiScanStatus {
    scan_id: string;
    status: string;
    is_active: boolean;
    output_folder?: string;
    findings?: any[];
}

// Create axios instance
const apiClient = axios.create({
    baseURL: '/api',  // Use Next.js API proxy instead of direct backend URL
    timeout: 300000, // 5 minutes for long scans
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Start a Nuclei scan
 */
export async function startNucleiScan(request: NucleiScanRequest): Promise<NucleiScanResponse> {
    const response = await apiClient.post<NucleiScanResponse>('/v1/nuclei/scan', request);
    return response.data;
}

/**
 * Get scan status
 */
export async function getScanStatus(scanId: string): Promise<NucleiScanStatus> {
    const response = await apiClient.get<NucleiScanStatus>(`/v1/nuclei/scan/${scanId}/status`);
    return response.data;
}

/**
 * Stop a running scan
 */
export async function stopScan(scanId: string): Promise<void> {
    await apiClient.post(`/v1/nuclei/scan/${scanId}/stop`);
}

/**
 * Get active scans
 */
export async function getActiveScans(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/v1/nuclei/scans/active');
    return response.data;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; service: string; version: string }> {
    const response = await apiClient.get('/health');
    return response.data;
}

/**
 * Create WebSocket connection for scan streaming
 */
export function createScanWebSocket(scanId: string): WebSocket {
    // Use window.location to get the correct host and protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host.replace(':3000', ':8000'); // Replace Next.js port with backend port
    const wsUrl = `${protocol}//${host}/api/v1/nuclei/scan/${scanId}/ws`;
    return new WebSocket(wsUrl);
}

export default apiClient;
