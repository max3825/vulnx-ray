'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Shield, Zap, Target, Activity, AlertTriangle, Play, RefreshCw,
    FileText, Trash2, Download, Filter, CheckCircle2, XCircle, Clock,
    ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';

const SEV_STYLE: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/20 border-red-500/50',
    high:     'text-orange-400 bg-orange-500/20 border-orange-500/50',
    medium:   'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    low:      'text-blue-400 bg-blue-500/20 border-blue-500/50',
    info:     'text-slate-400 bg-slate-500/20 border-slate-500/50',
};

export default function NucleiScanPage() {
    const [target, setTarget]       = useState('');
    const [templates, setTemplates] = useState('');
    const [cves, setCves]           = useState('');

    const [scanId, setScanId]         = useState<string | null>(null);
    const [scanStatus, setScanStatus] = useState<any>(null);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState<string | null>(null);

    const [scanHistory, setScanHistory]         = useState<any[]>([]);
    const [historyFilter, setHistoryFilter]     = useState('');
    const [expandedScan, setExpandedScan]       = useState<string | null>(null);
    const [expandedData, setExpandedData]       = useState<any>(null);
    const [loadingExpand, setLoadingExpand]     = useState(false);
    const [notification, setNotification]       = useState<{ type: 'success'|'error'; msg: string } | null>(null);

    const sseRef = useRef<EventSource | null>(null);

    const notify = (type: 'success'|'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 5000);
    };

    // ── Fetch history ──────────────────────────────────────────────────────
    const fetchHistory = async () => {
        try {
            const res = await apiFetch('/api/v1/nuclei/scans');
            if (res.ok) setScanHistory(await res.json());
        } catch {}
    };

    useEffect(() => { fetchHistory(); }, []);

    // Refresh when scan completes
    useEffect(() => {
        if (scanStatus && ['completed','failed','error'].includes(scanStatus.status)) {
            fetchHistory();
        }
    }, [scanStatus]);

    // ── SSE real-time progress ─────────────────────────────────────────────
    const startSSE = (id: string) => {
        if (sseRef.current) sseRef.current.close();
        // SSE needs auth header — we proxy through fetch polling instead (browser SSE can't set headers)
        // So we keep the existing poll approach for status, SSE is used as a nice-to-have
        const poll = setInterval(async () => {
            const res = await apiFetch(`/api/v1/nuclei/scan/${id}`);
            if (res.ok) {
                const data = await res.json();
                setScanStatus(data);
                if (['completed','failed','error'].includes(data.status)) {
                    clearInterval(poll);
                }
            }
        }, 2000);
        return () => clearInterval(poll);
    };

    // ── Start scan ─────────────────────────────────────────────────────────
    const handleStartScan = async () => {
        if (!target) { setError('Target URL is required'); return; }
        setLoading(true); setError(null); setScanStatus(null); setScanId(null);
        try {
            const payload = {
                target,
                templates: templates ? templates.split(',').map(t => t.trim()) : undefined,
                cves: cves ? cves.split(',').map(c => c.trim()) : undefined,
            };
            const res = await apiFetch('/api/v1/nuclei/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setScanId(data.scan_id);
            notify('success', `🚀 Scan started — ID: ${data.scan_id?.slice(0, 8)}...`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Poll while running
    useEffect(() => {
        if (!scanId || (scanStatus && ['completed','failed','error'].includes(scanStatus.status))) return;
        const stop = startSSE(scanId);
        return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanId]);

    // ── Delete scan ────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this scan and all its findings?')) return;
        const res = await apiFetch(`/api/v1/nuclei/scan/${id}`, { method: 'DELETE' });
        if (res.ok) { notify('success', '🗑️ Scan deleted'); fetchHistory(); if (scanId === id) { setScanId(null); setScanStatus(null); } }
        else notify('error', '❌ Delete failed');
    };

    // ── PDF export ─────────────────────────────────────────────────────────
    const handlePDF = async (id: string) => {
        notify('success', '📄 Generating PDF…');
        const res = await apiFetch(`/api/v1/nuclei/scan/${id}/pdf`);
        if (!res.ok) { notify('error', '❌ PDF generation failed'); return; }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url; a.download = `vulnxray_scan_${id.slice(0,8)}.pdf`;
        document.body.appendChild(a); a.click();
        URL.revokeObjectURL(url); document.body.removeChild(a);
    };

    // ── Expand scan detail ─────────────────────────────────────────────────
    const toggleExpand = async (id: string) => {
        if (expandedScan === id) { setExpandedScan(null); setExpandedData(null); return; }
        setExpandedScan(id); setLoadingExpand(true);
        try {
            const res = await apiFetch(`/api/v1/nuclei/scan/${id}`);
            if (res.ok) setExpandedData(await res.json());
        } finally { setLoadingExpand(false); }
    };

    // ── Reload scan into view ──────────────────────────────────────────────
    const handleReload = (scan: any) => {
        setScanId(scan.scan_id);
        setScanStatus(null);
        const res2 = apiFetch(`/api/v1/nuclei/scan/${scan.scan_id}`).then(r => r.json()).then(setScanStatus);
    };

    const filteredHistory = scanHistory.filter(s =>
        !historyFilter || s.target.includes(historyFilter) || s.status.includes(historyFilter)
    );

    const getSeverityColor = (s: string) => SEV_STYLE[s?.toLowerCase()] || SEV_STYLE.info;

    const statusIcon = (s: string) => {
        if (s === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        if (s === 'running')   return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
        if (['failed','error'].includes(s)) return <XCircle className="w-4 h-4 text-red-400" />;
        return <Clock className="w-4 h-4 text-slate-400" />;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-md ${notification.type === 'success' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-red-500/20 border-red-500/40 text-red-300'}`}>
                    {notification.msg}
                </div>
            )}

            <main className="container mx-auto px-6 py-8 max-w-7xl">
                {/* Hero */}
                <div className="mb-10">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-2">
                        🔬 Nuclei Scanner
                    </h1>
                    <p className="text-slate-400 text-lg">Run vulnerability scans powered by ProjectDiscovery Nuclei</p>
                </div>

                <div className="grid lg:grid-cols-5 gap-8">
                    {/* ── Left: Config ───────────────────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Target */}
                        <div className="p-6 bg-black/40 border border-slate-700/50 rounded-2xl">
                            <label className="text-sm text-slate-300 mb-2 block flex items-center gap-2"><Target className="w-4 h-4 text-purple-400"/>Target URL</label>
                            <input value={target} onChange={e => setTarget(e.target.value)}
                                placeholder="https://scanme.nmap.org"
                                className="w-full px-4 py-3 bg-black/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                            />
                        </div>

                        {/* Templates */}
                        <div className="p-6 bg-black/40 border border-slate-700/50 rounded-2xl">
                            <label className="text-sm text-slate-300 mb-2 block flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400"/>Templates <span className="text-slate-500">(optional)</span></label>
                            <input value={templates} onChange={e => setTemplates(e.target.value)}
                                placeholder="tech,cves,misconfigs"
                                className="w-full px-4 py-3 bg-black/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                            />
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['tech', 'cves', 'exposures', 'misconfigs', 'vulnerabilities'].map(t => (
                                    <button key={t} onClick={() => setTemplates(p => p ? `${p},${t}` : t)}
                                        className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full text-xs hover:bg-cyan-500/20 transition-colors">
                                        + {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* CVEs */}
                        <div className="p-6 bg-black/40 border border-slate-700/50 rounded-2xl">
                            <label className="text-sm text-slate-300 mb-2 block flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400"/>Specific CVEs <span className="text-slate-500">(optional)</span></label>
                            <input value={cves} onChange={e => setCves(e.target.value)}
                                placeholder="CVE-2021-44228, CVE-2022-22965"
                                className="w-full px-4 py-3 bg-black/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>
                        )}

                        <button onClick={handleStartScan} disabled={loading || !target}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20">
                            {loading ? <><RefreshCw className="w-5 h-5 animate-spin"/>Starting…</> : <><Play className="w-5 h-5"/>Launch Scan</>}
                        </button>
                    </div>

                    {/* ── Right: Live results ────────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-5">
                        {/* Current scan status */}
                        {scanStatus && (
                            <div className="p-6 bg-black/40 border border-slate-700/50 rounded-2xl">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-purple-400"/>Live Scan Result
                                    </h2>
                                    <div className="flex gap-2">
                                        {scanStatus.status === 'completed' && (
                                            <button onClick={() => handlePDF(scanStatus.scan_id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg text-xs hover:bg-purple-500/30 transition-colors">
                                                <Download className="w-3.5 h-3.5"/>PDF
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(scanStatus.scan_id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5"/>Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Progress bar while running */}
                                {scanStatus.status === 'running' && (
                                    <div className="mb-5">
                                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse rounded-full" style={{ width: '60%' }} />
                                        </div>
                                        <p className="text-slate-400 text-sm mt-2 flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/>Scan in progress…</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    {[
                                        { label: 'Target', value: scanStatus.target },
                                        { label: 'Status', value: scanStatus.status?.toUpperCase(), colored: true },
                                        { label: 'Started', value: scanStatus.started_at ? new Date(scanStatus.started_at).toLocaleString() : '—' },
                                        { label: 'Findings', value: scanStatus.findings_count ?? (scanStatus.findings?.length ?? '—') },
                                    ].map(item => (
                                        <div key={item.label} className="p-3 bg-slate-900/50 rounded-xl">
                                            <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                            <div className={`font-semibold text-sm ${item.colored ? (scanStatus.status === 'completed' ? 'text-green-400' : scanStatus.status === 'running' ? 'text-blue-400' : 'text-red-400') : 'text-white'} truncate`}>
                                                {String(item.value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Findings list */}
                                {scanStatus.findings && scanStatus.findings.length > 0 && (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {scanStatus.findings.map((f: any, i: number) => {
                                            const info = f.info || {};
                                            const sev  = (info.severity || 'info').toLowerCase();
                                            return (
                                                <div key={i} className={`p-3 rounded-xl border ${getSeverityColor(sev)}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm">{info.name || f['template-id']}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSeverityColor(sev)}`}>{sev.toUpperCase()}</span>
                                                    </div>
                                                    <div className="text-xs opacity-70 font-mono truncate">{f['matched-at'] || '—'}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {scanStatus.status === 'completed' && (!scanStatus.findings || scanStatus.findings.length === 0) && (
                                    <div className="text-center py-8 text-green-400">
                                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-70"/>
                                        <p className="font-semibold">No vulnerabilities found</p>
                                        <p className="text-slate-400 text-sm mt-1">Target appears clean</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!scanStatus && !loading && (
                            <div className="p-10 bg-black/20 border border-slate-800 rounded-2xl text-center text-slate-500">
                                <Shield className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                                <p>Configure a target and launch a scan to see results here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── History ──────────────────────────────────────────────────────── */}
                <div className="mt-12">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <FileText className="w-6 h-6 text-purple-400"/>Scan History
                            <span className="text-sm font-normal text-slate-500">({filteredHistory.length})</span>
                        </h2>
                        <div className="flex gap-3">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                <input value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}
                                    placeholder="Filter…"
                                    className="pl-9 pr-4 py-2 bg-black/40 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <button onClick={fetchHistory} className="p-2 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
                                <RefreshCw className="w-4 h-4 text-slate-300"/>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredHistory.length === 0 && (
                            <div className="text-center py-10 text-slate-500">No scans yet</div>
                        )}
                        {filteredHistory.map(scan => (
                            <div key={scan.scan_id} className="bg-black/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all">
                                <div className="flex items-center gap-4 p-4">
                                    {statusIcon(scan.status)}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-purple-300 text-sm truncate">{scan.target}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {scan.started_at ? new Date(scan.started_at).toLocaleString() : '—'}
                                            {' · '}{scan.findings_count ?? 0} finding{(scan.findings_count ?? 0) !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {scan.status === 'completed' && (
                                            <button onClick={() => handlePDF(scan.scan_id)}
                                                className="p-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors" title="Export PDF">
                                                <Download className="w-4 h-4"/>
                                            </button>
                                        )}
                                        <button onClick={() => toggleExpand(scan.scan_id)}
                                            className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors" title="View details">
                                            {expandedScan === scan.scan_id ? <ChevronUp className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                        <button onClick={() => handleReload(scan)}
                                            className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors" title="Load in view">
                                            <Activity className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => handleDelete(scan.scan_id)}
                                            className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors" title="Delete">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded findings */}
                                {expandedScan === scan.scan_id && (
                                    <div className="border-t border-slate-700/50 p-4 bg-slate-900/30">
                                        {loadingExpand ? (
                                            <div className="text-center py-4"><RefreshCw className="w-5 h-5 animate-spin text-purple-400 mx-auto"/></div>
                                        ) : expandedData?.findings?.length > 0 ? (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {expandedData.findings.map((f: any, i: number) => {
                                                    const info = f.info || {};
                                                    const sev  = (info.severity || 'info').toLowerCase();
                                                    return (
                                                        <div key={i} className={`p-3 rounded-xl border ${getSeverityColor(sev)} text-sm`}>
                                                            <div className="flex justify-between">
                                                                <span className="font-semibold">{info.name || f['template-id']}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs border ${getSeverityColor(sev)}`}>{sev.toUpperCase()}</span>
                                                            </div>
                                                            <div className="text-xs opacity-60 font-mono mt-1 truncate">{f['matched-at'] || '—'}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-sm text-center py-2">No findings recorded</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
