'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Terminal, Shield, Play, Square, Loader2, AlertCircle, Download, Filter, ChevronDown, ChevronRight, Copy, FileJson } from 'lucide-react';
import { NucleiScanRequest, startNucleiScan, createScanWebSocket, SeverityLevel } from '@/utils/nucleiApi';
import Navigation from '@/components/Navigation';

interface Finding {
    id: string;
    severity: string;
    title: string;
    templateId: string;
    url: string;
    cves: string[];
    timestamp: string;
}

export default function ScanPage() {
    // Form state
    const [targetUrl, setTargetUrl] = useState('');
    const [severity, setSeverity] = useState<SeverityLevel[]>(['critical', 'high']);

    // Scan state
    const [scanning, setScanning] = useState(false);
    const [scanId, setScanId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Terminal and findings state
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [activeTab, setActiveTab] = useState<'findings' | 'logs'>('findings');
    const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
    const [filterSeverity, setFilterSeverity] = useState<string>('all');

    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current && activeTab === 'logs') {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalLines, activeTab]);

    // Parse finding from terminal line
    const parseFinding = (lines: string[], startIdx: number): Finding | null => {
        try {
            const severityLine = lines[startIdx];
            const templateLine = lines[startIdx + 1] || '';
            const urlLine = lines[startIdx + 2] || '';
            const cveLine = lines[startIdx + 3] || '';

            // Extract severity and title from lines like: "🔴 [CRITICAL] SQL Injection Vulnerability"
            const severityMatch = severityLine.match(/^\s*[🔴🟠🟡🔵⚪⚫]\s*\[(\w+)\]\s*(.+)$/);
            if (!severityMatch) return null;

            const severity = severityMatch[1];
            const title = severityMatch[2];

            // Extract template ID
            const templateMatch = templateLine.match(/Template:\s*(.+)$/);
            const templateId = templateMatch ? templateMatch[1].trim() : 'unknown';

            // Extract URL
            const urlMatch = urlLine.match(/URL:\s*(.+)$/);
            const url = urlMatch ? urlMatch[1].trim() : '';

            // Extract CVEs if present
            const cveMatch = cveLine.match(/CVEs:\s*(.+)$/);
            const cves = cveMatch ? cveMatch[1].split(',').map(c => c.trim()) : [];

            return {
                id: `${Date.now()}-${Math.random()}`,
                severity: severity.toLowerCase(),
                title,
                templateId,
                url,
                cves,
                timestamp: new Date().toISOString(),
            };
        } catch {
            return null;
        }
    };

    const handleStartScan = async () => {
        // Validation
        if (!targetUrl) {
            setError('Please provide a target URL');
            return;
        }

        setError(null);
        setTerminalLines([]);
        setFindings([]);
        setScanning(true);

        try {
            // Start scan
            const request: NucleiScanRequest = {
                target_url: targetUrl,
                severity: severity.length > 0 ? severity : undefined,
            };

            const response = await startNucleiScan(request);
            setScanId(response.scan_id);

            setTerminalLines(prev => [
                ...prev,
                `[INFO] Scan created: ${response.scan_id}`,
                `[INFO] Command: ${response.command}`,
                `[INFO] Connecting to WebSocket...`,
                '='.repeat(80),
            ]);

            // Connect WebSocket
            const ws = createScanWebSocket(response.scan_id);
            wsRef.current = ws;

            ws.onopen = () => {
                setTerminalLines(prev => [...prev, '[INFO] WebSocket connected']);
                ws.send(JSON.stringify(request));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'log') {
                    const line = data.line.trimEnd();
                    setTerminalLines(prev => {
                        const newLines = [...prev, line];

                        // Check if this line starts a finding (contains severity emoji)
                        if (line.match(/^\s*[🔴🟠🟡🔵⚪⚫]\s*\[/)) {
                            const finding = parseFinding(newLines, newLines.length - 1);
                            if (finding) {
                                setFindings(prevFindings => [...prevFindings, finding]);
                            }
                        }

                        return newLines;
                    });
                } else if (data.type === 'completed') {
                    setTerminalLines(prev => [
                        ...prev,
                        '='.repeat(80),
                        '[SUCCESS] Scan completed!',
                    ]);
                    setScanning(false);
                } else if (data.type === 'error') {
                    setTerminalLines(prev => [
                        ...prev,
                        `[ERROR] ${data.message}`,
                    ]);
                    setScanning(false);
                }
            };

            ws.onerror = () => {
                setTerminalLines(prev => [...prev, '[ERROR] WebSocket connection error']);
                setScanning(false);
            };

            ws.onclose = () => {
                setTerminalLines(prev => [...prev, '[INFO] WebSocket disconnected']);
                setScanning(false);
            };

        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to start scan');
            setScanning(false);
        }
    };

    const handleStopScan = () => {
        if (wsRef.current) {
            wsRef.current.close();
            setTerminalLines(prev => [...prev, '[INFO] Scan stopped by user']);
        }
        setScanning(false);
    };

    const downloadLogs = () => {
        const blob = new Blob([terminalLines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nuclei_scan_${scanId || 'logs'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadFindings = () => {
        const blob = new Blob([JSON.stringify(findings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nuclei_findings_${scanId || 'results'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const toggleFindingExpansion = (id: string) => {
        setExpandedFindings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const getSeverityColor = (sev: string) => {
        switch (sev.toLowerCase()) {
            case 'critical': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-blue-500';
            case 'info': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getSeverityIcon = (sev: string) => {
        switch (sev.toLowerCase()) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🔵';
            case 'info': return '⚪';
            default: return '⚫';
        }
    };

    const filteredFindings = filterSeverity === 'all'
        ? findings
        : findings.filter(f => f.severity === filterSeverity);

    const stats = {
        total: findings.length,
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            <main className="container-custom py-8 max-w-7xl">
                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-6 bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-xl">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <Terminal className="w-6 h-6 text-purple-400" />
                                CVE Vulnerability Scanner
                            </h2>

                            <div className="space-y-4">
                                {/* Target URL */}
                                <div>
                                    <label className="block text-white font-medium mb-2 text-sm">
                                        Target URL
                                    </label>
                                    <input
                                        type="text"
                                        value={targetUrl}
                                        onChange={(e) => setTargetUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        disabled={scanning}
                                        className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                {/* Severity Filter */}
                                <div>
                                    <label className="block text-white font-medium mb-2 text-sm">
                                        <Filter className="w-4 h-4 inline mr-2" />
                                        Severity Levels
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['critical', 'high', 'medium', 'low', 'info'] as SeverityLevel[]).map((sev) => (
                                            <label key={sev} className="flex items-center gap-2 p-2 bg-black/20 border border-purple-500/20 rounded cursor-pointer hover:bg-purple-500/10">
                                                <input
                                                    type="checkbox"
                                                    checked={severity.includes(sev)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSeverity([...severity, sev]);
                                                        } else {
                                                            setSeverity(severity.filter(s => s !== sev));
                                                        }
                                                    }}
                                                    disabled={scanning}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-white text-sm capitalize">{sev}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-purple-300/70 text-xs mt-2">Select severity levels to scan for (7000+ Nuclei templates)</p>
                                </div>

                                {/* Error Display */}
                                {error && (
                                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-200 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Scan Statistics */}
                                {findings.length > 0 && (
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                        <h3 className="text-white font-semibold mb-3 text-sm">Findings Summary</h3>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-300">Total:</span>
                                                <span className="text-white font-bold">{stats.total}</span>
                                            </div>
                                            {stats.critical > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getSeverityColor('critical')}`}></span>
                                                    <span className="text-white">{stats.critical} Critical</span>
                                                </div>
                                            )}
                                            {stats.high > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getSeverityColor('high')}`}></span>
                                                    <span className="text-white">{stats.high} High</span>
                                                </div>
                                            )}
                                            {stats.medium > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getSeverityColor('medium')}`}></span>
                                                    <span className="text-white">{stats.medium} Medium</span>
                                                </div>
                                            )}
                                            {stats.low > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getSeverityColor('low')}`}></span>
                                                    <span className="text-white">{stats.low} Low</span>
                                                </div>
                                            )}
                                            {stats.info > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getSeverityColor('info')}`}></span>
                                                    <span className="text-white">{stats.info} Info</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    {!scanning ? (
                                        <button
                                            onClick={handleStartScan}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-5 h-5" />
                                            Start Scan
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStopScan}
                                            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                        >
                                            <Square className="w-5 h-5" />
                                            Stop Scan
                                        </button>
                                    )}

                                    {findings.length > 0 && (
                                        <button
                                            onClick={downloadFindings}
                                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                                            title="Export findings as JSON"
                                        >
                                            <FileJson className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-3">
                        <div className="bg-black/60 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden h-[calc(100vh-12rem)]">
                            {/* Tabs Header */}
                            <div className="bg-purple-900/30 border-b border-purple-500/30">
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveTab('findings')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'findings'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-transparent text-purple-300 hover:bg-purple-500/20'
                                                }`}
                                        >
                                            Findings {findings.length > 0 && `(${findings.length})`}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('logs')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-transparent text-purple-300 hover:bg-purple-500/20'
                                                }`}
                                        >
                                            Raw Logs
                                        </button>
                                    </div>
                                    {scanning && (
                                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                    )}
                                </div>

                                {/* Severity Filter for Findings Tab */}
                                {activeTab === 'findings' && findings.length > 0 && (
                                    <div className="px-4 pb-3 flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => setFilterSeverity('all')}
                                            className={`px-3 py-1 rounded text-xs ${filterSeverity === 'all'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white/10 text-purple-300 hover:bg-white/20'
                                                }`}
                                        >
                                            All ({stats.total})
                                        </button>
                                        {stats.critical > 0 && (
                                            <button
                                                onClick={() => setFilterSeverity('critical')}
                                                className={`px-3 py-1 rounded text-xs ${filterSeverity === 'critical'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                                                    }`}
                                            >
                                                Critical ({stats.critical})
                                            </button>
                                        )}
                                        {stats.high > 0 && (
                                            <button
                                                onClick={() => setFilterSeverity('high')}
                                                className={`px-3 py-1 rounded text-xs ${filterSeverity === 'high'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                                                    }`}
                                            >
                                                High ({stats.high})
                                            </button>
                                        )}
                                        {stats.medium > 0 && (
                                            <button
                                                onClick={() => setFilterSeverity('medium')}
                                                className={`px-3 py-1 rounded text-xs ${filterSeverity === 'medium'
                                                    ? 'bg-yellow-600 text-white'
                                                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                                                    }`}
                                            >
                                                Medium ({stats.medium})
                                            </button>
                                        )}
                                        {stats.low > 0 && (
                                            <button
                                                onClick={() => setFilterSeverity('low')}
                                                className={`px-3 py-1 rounded text-xs ${filterSeverity === 'low'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                                                    }`}
                                            >
                                                Low ({stats.low})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Content Area */}
                            <div className="overflow-y-auto h-full" style={{ maxHeight: 'calc(100vh - 15rem)' }}>
                                {activeTab === 'findings' ? (
                                    <div className="p-4 space-y-2">
                                        {filteredFindings.length === 0 ? (
                                            <div className="text-purple-300/50 italic text-center py-12">
                                                {findings.length === 0
                                                    ? 'No vulnerabilities found yet. Start a scan to discover findings.'
                                                    : 'No findings match the selected filter.'}
                                            </div>
                                        ) : (
                                            filteredFindings.map((finding) => {
                                                const isExpanded = expandedFindings.has(finding.id);
                                                return (
                                                    <div
                                                        key={finding.id}
                                                        className="bg-white/5 border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-all"
                                                    >
                                                        {/* Finding Header */}
                                                        <div
                                                            className="p-3 flex items-start gap-3 cursor-pointer"
                                                            onClick={() => toggleFindingExpansion(finding.id)}
                                                        >
                                                            <div className="mt-1">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-4 h-4 text-purple-300" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-purple-300" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${getSeverityColor(finding.severity)}`}>
                                                                        {getSeverityIcon(finding.severity)} {finding.severity.toUpperCase()}
                                                                    </span>
                                                                    <span className="text-white text-sm font-medium truncate">
                                                                        {finding.title}
                                                                    </span>
                                                                </div>
                                                                <div className="text-purple-300/70 text-xs font-mono truncate">
                                                                    {finding.templateId}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Details */}
                                                        {isExpanded && (
                                                            <div className="px-3 pb-3 pl-10 space-y-2 text-sm">
                                                                <div className="bg-black/30 rounded p-2">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-purple-300 text-xs">Matched URL:</span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                copyToClipboard(finding.url);
                                                                            }}
                                                                            className="text-purple-400 hover:text-purple-300"
                                                                            title="Copy URL"
                                                                        >
                                                                            <Copy className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-white text-xs font-mono break-all">
                                                                        {finding.url}
                                                                    </div>
                                                                </div>

                                                                {finding.cves.length > 0 && (
                                                                    <div className="bg-black/30 rounded p-2">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-purple-300 text-xs">CVE IDs:</span>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    copyToClipboard(finding.cves.join(', '));
                                                                                }}
                                                                                className="text-purple-400 hover:text-purple-300"
                                                                                title="Copy CVEs"
                                                                            >
                                                                                <Copy className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {finding.cves.map((cve, idx) => (
                                                                                <span
                                                                                    key={idx}
                                                                                    className="px-2 py-0.5 bg-purple-600/30 text-purple-200 rounded text-xs font-mono"
                                                                                >
                                                                                    {cve}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="text-purple-300/50 text-xs">
                                                                    Found at {new Date(finding.timestamp).toLocaleTimeString()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        ref={terminalRef}
                                        className="p-4 font-mono text-sm text-green-400"
                                    >
                                        {terminalLines.length === 0 ? (
                                            <div className="text-purple-300/50 italic">
                                                Waiting for scan to start...
                                                <br />
                                                Configure your scan parameters and click &quot;Start Scan&quot;
                                            </div>
                                        ) : (
                                            terminalLines.map((line, idx) => (
                                                <div key={idx} className="whitespace-pre-wrap break-all">
                                                    {line}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
