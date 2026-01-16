import React, { useState } from 'react';
import { X, AlertTriangle, Mail, Globe, Sparkles } from 'lucide-react';
import { AlertRuleCreate } from '@/utils/vulnxApi';

interface CreateAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: AlertRuleCreate) => Promise<void>;
}

export default function CreateAlertModal({ isOpen, onClose, onSave }: CreateAlertModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
    const [isKev, setIsKev] = useState(false);
    const [emails, setEmails] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const rule: AlertRuleCreate = {
                name,
                filters: {
                    query: keywords || undefined,
                    severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
                    is_kev: isKev ? true : undefined
                },
                emails: emails.split(',').map(e => e.trim()).filter(Boolean),
                webhook_url: webhookUrl || undefined
            };
            await onSave(rule);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSeverity = (sev: string) => {
        if (selectedSeverities.includes(sev)) {
            setSelectedSeverities(selectedSeverities.filter(s => s !== sev));
        } else {
            setSelectedSeverities([...selectedSeverities, sev]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-500/20 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Create Alert Rule
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Rule Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            placeholder="e.g., Critical Apache Vulnerabilities"
                        />
                    </div>

                    {/* Filters */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Filters</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                            <div className="flex flex-wrap gap-2">
                                {['critical', 'high', 'medium', 'low'].map(sev => (
                                    <button
                                        key={sev}
                                        type="button"
                                        onClick={() => toggleSeverity(sev)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedSeverities.includes(sev)
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Keywords</label>
                            <input
                                type="text"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="e.g., wordpress, struts, log4j"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
                            <input
                                type="checkbox"
                                id="is_kev"
                                checked={isKev}
                                onChange={(e) => setIsKev(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-slate-700"
                            />
                            <label htmlFor="is_kev" className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                Only notify for Known Exploited Vulnerabilities (KEV)
                            </label>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Notifications</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email Recipients
                            </label>
                            <input
                                type="text"
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="audit-team@example.com, security@company.com"
                            />
                            <p className="text-xs text-gray-500 mt-1">Comma separated list of emails</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Webhook URL
                            </label>
                            <input
                                type="url"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="https://hooks.slack.com/services/..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Rule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
