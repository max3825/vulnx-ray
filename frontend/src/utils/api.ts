/**
 * API Client for VulnX-Ray Vulnx Wrapper Backend
 */

import axios from 'axios';

export interface VulnxScanRequest {
    dork?: string;
    target_url?: string;
    cms_name?: string;
    run_exploit?: boolean;
}

export interface VulnxScanResponse {
    scan_id: string;
    status: string;
    command: string;
    output_folder: string;
    started_at: string;
}

export interface VulnxScanStatus {
    scan_id: string;
    status: string;
    is_active: boolean;
    output_folder?: string;
    files?: string[];
}

// Create axios instance
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 300000, // 5 minutes for long scans
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Start a Vulnx scan
 */
export async function startVulnxScan(request: VulnxScanRequest): Promise<VulnxScanResponse> {
    const response = await apiClient.post<VulnxScanResponse>('/api/v1/vulnx/scan', request);
    return response.data;
}

/**
 * Get scan status
 */
export async function getScanStatus(scanId: string): Promise<VulnxScanStatus> {
    const response = await apiClient.get<VulnxScanStatus>(`/api/v1/vulnx/scan/${scanId}/status`);
    return response.data;
}

/**
 * Stop a running scan
 */
export async function stopScan(scanId: string): Promise<void> {
    await apiClient.post(`/api/v1/vulnx/scan/${scanId}/stop`);
}

/**
 * Get active scans
 */
export async function getActiveScans(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/api/v1/vulnx/scans/active');
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
    const wsUrl = `ws://localhost:8000/api/v1/vulnx/scan/${scanId}/ws`;
    return new WebSocket(wsUrl);
}

export default apiClient;
