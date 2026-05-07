import { apiFetch } from '@/utils/api';
// API client for VulnX CVE Search functionality

const API_BASE_URL = '/api/v1/vulnx-search';

export interface CVEResult {
    cve_id: string;
    description: string;
    severity: string;
    cvss_score?: number | null;
    cvss_metrics?: Record<string, any>;
    cvss_vector?: string | null;
    published_date?: string | null;
    published_at?: string | null;
    modified_date?: string | null;
    updated_at?: string | null;
    affected_products: Array<string | { vendor?: string; product?: string;[key: string]: any }>;
    references: string[];
    is_kev: boolean;
    is_poc: boolean;           // Renamed from has_poc
    is_template: boolean;      // Renamed from has_nuclei_template
    is_remote: boolean;        // Renamed from has_remote_exploit
    epss_score?: number | null;
    cisa_actionable: boolean;
    cwe_ids?: string[];
    exploits?: any[];
    poc_links?: string[];
    nuclei_templates?: string[];
}

export interface CVESearchResponse {
    success: boolean;
    total_count: number;
    results: CVEResult[];
    query: string;
    filters_applied: Record<string, any>;
}




export interface SeverityStats {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}

export interface YearlyStats {
    year: number;
    count: number;
}

export interface DashboardStats {
    total_cves: number;
    severity_distribution: SeverityStats;
    yearly_trends: YearlyStats[];
    kev_count: number;
    poc_count: number;
    remote_count: number;
    updated_at: string;
}

export type CVEStats = DashboardStats;

export interface FilterInfo {
    name: string;
    description: string;
    example: string;
    type: string;
}

export interface FiltersResponse {
    success: boolean;
    filters: FilterInfo[];
}

export interface SearchFilters {
    query?: string;
    severity?: string[];
    cvss_min?: number;
    cvss_max?: number;
    cve_year?: number;
    is_kev?: boolean;
    has_poc?: boolean;
    has_nuclei_template?: boolean;
    has_remote_exploit?: boolean;
    limit?: number;
}

/**
 * Search for CVEs with filters
 */
export async function searchCVEs(filters: SearchFilters): Promise<CVESearchResponse> {
    const response = await apiFetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
    });

    if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get detailed information for a specific CVE
 */
/**
 * Get detailed information for a specific CVE
 */
export async function getCVEDetail(cveId: string): Promise<CVEResult> {
    const response = await apiFetch(`${API_BASE_URL}/cve/${cveId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch CVE details: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get global CVE statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const response = await apiFetch(`${API_BASE_URL}/stats`);

    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get available search filters
 */
export async function getFilters(): Promise<FiltersResponse> {
    const response = await apiFetch(`${API_BASE_URL}/filters`);

    if (!response.ok) {
        throw new Error(`Failed to fetch filters: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Test vulnx installation
 */
export async function testVulnxInstallation(): Promise<{ success: boolean; message: string; version?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/test`);

    if (!response.ok) {
        throw new Error(`Test failed: ${response.statusText}`);
    }

    return response.json();
}

// --- Alerts API ---

export interface AlertRule {
    id: number;
    name: string;
    description?: string;
    filters: Record<string, any>;
    is_active: boolean;
    emails: string[];
    webhook_url?: string;
    created_at: string;
    last_triggered_at?: string;
}

export interface AlertHistory {
    id: number;
    rule_id: number;
    cve_id: string;
    sent_at: string;
}

export interface AlertRuleCreate {
    name: string;
    description?: string;
    filters: Record<string, any>;
    is_active?: boolean;
    emails?: string[];
    webhook_url?: string;
}

export async function getAlertRules(): Promise<AlertRule[]> {
    const response = await apiFetch(`${API_BASE_URL.replace('vulnx-search', 'alerts')}`);
    if (!response.ok) throw new Error('Failed to fetch alert rules');
    return response.json();
}

export async function createAlertRule(rule: AlertRuleCreate): Promise<AlertRule> {
    const response = await apiFetch(`${API_BASE_URL.replace('vulnx-search', 'alerts')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
    });
    if (!response.ok) throw new Error('Failed to create alert rule');
    return response.json();
}

export async function deleteAlertRule(id: number): Promise<void> {
    const response = await apiFetch(`${API_BASE_URL.replace('vulnx-search', 'alerts')}/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete alert rule');
}

export async function toggleAlertRule(id: number, isActive: boolean): Promise<AlertRule> {
    const response = await apiFetch(`${API_BASE_URL.replace('vulnx-search', 'alerts')}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
    });
    if (!response.ok) throw new Error('Failed to update alert rule');
    return response.json();
}

export async function testAlertRule(id: number): Promise<void> {
    const response = await apiFetch(`${API_BASE_URL.replace('vulnx-search', 'alerts')}/${id}/test`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to trigger test');
}

export async function getAlertHistory(ruleId: number): Promise<AlertHistory[]> {
    const response = await apiFetch(`${API_BASE_URL.replace('vulnx-search', 'alerts')}/${ruleId}/history`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
}
