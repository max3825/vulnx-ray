"use client";

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import CreateAlertModal from '@/components/CreateAlertModal';
import AlertHistoryModal from '@/components/AlertHistoryModal';
import {
    AlertRule,
    getAlertRules,
    createAlertRule,
    deleteAlertRule,
    toggleAlertRule,
    testAlertRule,
    AlertRuleCreate
} from '@/utils/vulnxApi';
import {
    Bell,
    Plus,
    Trash2,
    Play,
    Power,
    PowerOff,
    Mail,
    Globe,
    AlertTriangle,
    Shield,
    Loader2,
    History
} from 'lucide-react';

export default function AlertsPage() {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [iscreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [historyRule, setHistoryRule] = useState<{ id: number, name: string } | null>(null);
    const [triggering, setTriggering] = useState<number | null>(null);

    const fetchRules = async () => {
        try {
            const data = await getAlertRules();
            setRules(data);
        } catch (err) {
            console.error('Failed to load rules:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreateRule = async (newRule: AlertRuleCreate) => {
        try {
            await createAlertRule(newRule);
            await fetchRules();
        } catch (err) {
            console.error('Failed to create rule:', err);
            alert('Failed to create rule');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this alert rule?')) return;
        try {
            await deleteAlertRule(id);
            setRules(rules.filter(r => r.id !== id));
        } catch (err) {
            console.error('Failed to delete rule:', err);
        }
    };

    const handleToggle = async (id: number, currentStatus: boolean) => {
        try {
            const updated = await toggleAlertRule(id, !currentStatus);
            setRules(rules.map(r => r.id === id ? updated : r));
        } catch (err) {
            console.error('Failed to update rule:', err);
        }
    };

    const handleTest = async (id: number) => {
        setTriggering(id);
        try {
            await testAlertRule(id);
            alert('Test run triggered! Check the backend logs for mock notification details.');
        } catch (err) {
            console.error('Failed to trigger test:', err);
            alert('Failed to trigger test run');
        } finally {
            setTriggering(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
                <Navigation />
                <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Bell className="w-8 h-8 text-purple-400" />
                            Notification Rules
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Configure alerts to get notified about new vulnerabilities matching your criteria.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-purple-900/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Alert Rule
                    </button>
                </div>

                {/* Rules Grid */}
                {rules.length === 0 ? (
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                            <Bell className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Alert Rules</h3>
                        <p className="text-gray-400 max-w-md mx-auto mb-6">
                            You haven't created any notification rules yet. Set up alerts to stay ahead of critical vulnerabilities.
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="text-purple-400 hover:text-purple-300 font-medium"
                        >
                            Create your first rule &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rules.map(rule => (
                            <div key={rule.id} className="bg-slate-900/80 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">{rule.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-400'}`}>
                                                {rule.is_active ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggle(rule.id, rule.is_active)}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                                            title={rule.is_active ? "Disable" : "Enable"}
                                        >
                                            {rule.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => setHistoryRule({ id: rule.id, name: rule.name })}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                                            title="View History"
                                        >
                                            <History className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {rule.filters.severity && (
                                        <div className="flex flex-wrap gap-1">
                                            {rule.filters.severity.map((sev: string) => (
                                                <span key={sev} className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-gray-300 border border-white/5 uppercase">
                                                    {sev}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {rule.filters.is_kev && (
                                        <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 w-fit">
                                            <AlertTriangle className="w-3 h-3" />
                                            KEV Only
                                        </div>
                                    )}
                                    {rule.filters.query && (
                                        <div className="text-sm text-gray-400 truncate">
                                            Query: <span className="text-white">"{rule.filters.query}"</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500 border-t border-white/5 pt-4">
                                    <div className="flex items-center gap-1" title="Email recipients">
                                        <Mail className={`w-4 h-4 ${rule.emails.length > 0 ? 'text-purple-400' : ''}`} />
                                        <span>{rule.emails.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1" title="Webhook Configured">
                                        <Globe className={`w-4 h-4 ${rule.webhook_url ? 'text-cyan-400' : ''}`} />
                                        <span>{rule.webhook_url ? 'On' : 'Off'}</span>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <button
                                            onClick={() => handleTest(rule.id)}
                                            disabled={triggering === rule.id}
                                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-auto disabled:opacity-50"
                                        >
                                            {triggering === rule.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Play className="w-3 h-3" />
                                            )}
                                            Test Run
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateAlertModal
                isOpen={iscreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateRule}
            />

            <AlertHistoryModal
                isOpen={!!historyRule}
                onClose={() => setHistoryRule(null)}
                ruleId={historyRule?.id || null}
                ruleName={historyRule?.name || ''}
            />
        </div>
    );
}
