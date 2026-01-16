
import React, { useEffect, useState } from 'react';
import { X, Clock, AlertCircle, History } from 'lucide-react';
import { AlertHistory, getAlertHistory } from '@/utils/vulnxApi';

interface AlertHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    ruleId: number | null;
    ruleName: string;
}

export default function AlertHistoryModal({ isOpen, onClose, ruleId, ruleName }: AlertHistoryModalProps) {
    const [history, setHistory] = useState<AlertHistory[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && ruleId) {
            loadHistory(ruleId);
        }
    }, [isOpen, ruleId]);

    const loadHistory = async (id: number) => {
        setLoading(true);
        try {
            const data = await getAlertHistory(id);
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-500/20 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-400" />
                        Alert History: {ruleName}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            No notifications have been sent for this rule yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-gray-500 border-b border-white/5">
                                    <tr>
                                        <th className="pb-2 pl-4">Timestamp</th>
                                        <th className="pb-2">CVE ID</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {history.map((item) => (
                                        <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                            <td className="py-3 pl-4 text-gray-400">
                                                {new Date(item.sent_at).toLocaleString()}
                                            </td>
                                            <td className="py-3 font-mono text-purple-400">
                                                {item.cve_id}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
