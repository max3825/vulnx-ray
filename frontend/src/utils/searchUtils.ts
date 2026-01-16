/**
 * Search history and saved searches utilities
 */

export interface SavedSearch {
    id: number;
    name: string;
    description?: string;
    query?: string;
    filters: Record<string, any>;
    created_at: string;
    last_used_at?: string;
    use_count: number;
    is_favorite: boolean;
}

export interface SearchHistory {
    id: number;
    query?: string;
    filters: Record<string, any>;
    results_count: number;
    executed_at: string;
    execution_time_ms?: number;
}

/**
 * Log a search to history
 */
export async function logSearchHistory(
    query: string | null,
    filters: Record<string, any>,
    resultsCount: number
): Promise<void> {
    try {
        await fetch('/api/v1/searches/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                filters,
                results_count: resultsCount
            })
        });
    } catch (error) {
        console.error('Failed to log search history:', error);
    }
}

/**
 * Fetch all saved searches
 */
export async function fetchSavedSearches(): Promise<SavedSearch[]> {
    try {
        const response = await fetch('/api/v1/searches/saved');
        if (!response.ok) throw new Error('Failed to fet ch saved searches');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Failed to fetch saved searches:', error);
        return [];
    }
}

/**
 * Save a new search
 */
export async function saveSearch(
    name: string,
    description: string,
    query: string | null,
    filters: Record<string, any>
): Promise<SavedSearch | null> {
    try {
        const response = await fetch('/api/v1/searches/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description: description || null,
                query,
                filters
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save search');
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to save search:', error);
        throw error;
    }
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(id: number): Promise<void> {
    try {
        const response = await fetch(`/api/v1/searches/saved/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete saved search');
        }
    } catch (error) {
        console.error('Failed to delete saved search:', error);
        throw error;
    }
}

/**
 * Execute a saved search
 */
export async function executeSavedSearch(id: number): Promise<Record<string, any>> {
    try {
        const response = await fetch(`/api/v1/searches/saved/${id}/execute`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to execute saved search');
        }

        const data = await response.json();
        return data.filters;
    } catch (error) {
        console.error('Failed to execute saved search:', error);
        throw error;
    }
}

/**
 * Toggle favorite status of a saved search
 */
export async function toggleFavorite(id: number, isFavorite: boolean): Promise<void> {
    try {
        const response = await fetch(`/api/v1/searches/saved/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                is_favorite: !isFavorite
            })
        });

        if (!response.ok) {
            throw new Error('Failed to toggle favorite');
        }
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        throw error;
    }
}
