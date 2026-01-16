'use client';

import { Star, Trash2, Play, Clock } from 'lucide-react';
import { SavedSearch } from '../utils/searchUtils';

interface SavedSearchesSidebarProps {
    searches: SavedSearch[];
    onLoad: (search: SavedSearch) => void;
    onDelete: (id: number) => void;
    onToggleFavorite: (id: number, isFavorite: boolean) => void;
}

export default function SavedSearchesSidebar({
    searches,
    onLoad,
    onDelete,
    onToggleFavorite
}: SavedSearchesSidebarProps) {
    if (searches.length === 0) {
        return (
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-xl">
                <p className="text-gray-400 text-center">
                    No saved searches yet. Run a search and click &quot;Save Search&quot; to save it!
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Saved Searches ({searches.length})
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {searches.map((search) => (
                    <div
                        key={search.id}
                        className="p-4 bg-black/40 border border-purple-500/20 rounded-lg hover:border-purple-500/50 transition-all group">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                    {search.name}
                                    {search.is_favorite && (
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    )}
                                </h4>
                                {search.description && (
                                    <p className="text-gray-400 text-xs mt-1">
                                        {search.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                            <span>Used {search.use_count} time{search.use_count !== 1 ? 's' : ''}</span>
                            {search.query && (
                                <>
                                    <span>•</span>
                                    <span className="text-purple-300">&quot;{search.query}&quot;</span>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onLoad(search)}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                                <Play className="w-4 h-4" />
                                Load
                            </button>

                            <button
                                onClick={() => onToggleFavorite(search.id, search.is_favorite)}
                                className={`px-3 py-2 rounded-lg transition-all ${search.is_favorite
                                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400'
                                    }`}
                                title={search.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                                <Star className={`w-4 h-4 ${search.is_favorite ? 'fill-yellow-400' : ''}`} />
                            </button>

                            <button
                                onClick={() => onDelete(search.id)}
                                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                                title="Delete search">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
