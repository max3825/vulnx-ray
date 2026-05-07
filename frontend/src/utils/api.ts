/**
 * API Client Configuration
 */

const API_KEY = 'vulnx-secret-key-123';

/**
 * Wrapper around native fetch that automatically injects the API key.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (!headers.has('X-API-Key')) {
        headers.set('X-API-Key', API_KEY);
    }
    
    return fetch(input, {
        ...init,
        headers,
    });
}

