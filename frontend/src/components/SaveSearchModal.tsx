'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface SaveSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => Promise<void>;
}

export default function SaveSearchModal({ isOpen, onClose, onSave }: SaveSearchModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Search name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(name, description);
            setName('');
            setDescription('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save search');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Save className="w-6 h-6 text-purple-400" />
                        Save Search
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Search Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Critical Apache CVEs"
                            className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe this search configuration..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            maxLength={500}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                            disabled={saving}>
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
                            {saving ? (
                                <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Search
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
