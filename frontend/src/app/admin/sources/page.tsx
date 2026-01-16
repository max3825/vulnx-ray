'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { ingestionApi, SourceStatus, IngestionJob } from '@/utils/ingestionApi';
import {
    Database,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    Server,
    ShieldAlert,
    Github,
    Rss
} from 'lucide-react';

export default function DataSourcesPage() {
    const [sources, setSources] = useState<SourceStatus[]>([]);
    const [jobs, setJobs] = useState<IngestionJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [ingesting, setIngesting] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [sourcesData, jobsData] = await Promise.all([
                ingestionApi.getSourcesStatus(),
                ingestionApi.getRecentJobs(10)
            ]);
            setSources(sourcesData);
            setJobs(jobsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleIngest = async (sourceName: string) => {
        setIngesting(sourceName);
        try {
            await ingestionApi.runIngestion(sourceName);
            // Refresh immediately to show running job
            setTimeout(fetchData, 1000);
        } catch (error) {
            console.error(`Failed to trigger ingestion for ${sourceName}:`, error);
            alert('Failed to start ingestion');
        } finally {
            setIngesting(null);
        }
    };

    const getSourceIcon = (name: string) => {
        switch (name.toLowerCase()) {
            case 'github':
                return <Github className="w-8 h-8 text-white" />;
            case 'nvd_rss':
                return <Rss className="w-8 h-8 text-orange-400" />;
            case 'vulners':
                return <ShieldAlert className="w-8 h-8 text-red-500" />;
            default:
                return <Database className="w-8 h-8 text-blue-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'failed':
                return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'running':
                return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default:
                return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            <main className="container mx-auto px-6 py-8 max-w-[1600px]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
                            <Server className="w-8 h-8 text-blue-400" />
                            Data Sources Management
                        </h1>
                        <p className="text-slate-400 mt-2">Manage and monitor CVE data ingestion pipelines</p>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Sources Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Defined Sources Cards */}
                    {['nvd_rss', 'github'].map((sourceName) => {
                        const status = sources.find(s => s.name === sourceName);
                        const isIngesting = ingesting === sourceName;

                        return (
                            <div key={sourceName} className="bg-black/40 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 shadow-xl hover:border-purple-500/30 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        {getSourceIcon(sourceName)}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${status?.last_success ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'}`}>
                                        {status?.last_success ? 'Active' : 'Not Synced'}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-100 mb-1 capitalize">
                                    {sourceName.replace('_', ' ')}
                                </h3>
                                <p className="text-sm text-slate-400 mb-6">
                                    {sourceName === 'nvd_rss' ? 'Real-time CVE feed from National Vulnerability Database' : 'Security advisories from GitHub database'}
                                </p>

                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Total Records</span>
                                        <span className="text-slate-200 font-mono">{status?.cve_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Last Sync</span>
                                        <span className="text-slate-200">{status?.last_success ? new Date(status.last_success).toLocaleString() : 'Never'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleIngest(sourceName)}
                                    disabled={isIngesting}
                                    className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isIngesting
                                            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/50'
                                        }`}
                                >
                                    {isIngesting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Run Ingestion
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Jobs History Table */}
                <div className="bg-black/40 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
                    <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            Ingestion History
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/30 text-slate-400 text-sm">
                                    <th className="px-6 py-3 font-medium">Job ID</th>
                                    <th className="px-6 py-3 font-medium">Source</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Started At</th>
                                    <th className="px-6 py-3 font-medium text-right">Processed</th>
                                    <th className="px-6 py-3 font-medium text-right">Added</th>
                                    <th className="px-6 py-3 font-medium text-right">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30 text-sm">
                                {jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                            No ingestion jobs found
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-500">#{job.id}</td>
                                            <td className="px-6 py-4 capitalize font-medium text-slate-300">
                                                {job.source_name.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                                                    {job.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                                                    {job.status === 'failed' && <XCircle className="w-3 h-3" />}
                                                    {job.status === 'running' && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                    {job.status.toUpperCase()}
                                                </span>
                                                {job.error_message && (
                                                    <div className="text-xs text-red-400 mt-1 max-w-xs truncate" title={job.error_message}>
                                                        {job.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {new Date(job.started_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-mono">{job.cves_processed}</td>
                                            <td className="px-6 py-4 text-right text-green-400 font-mono">+{job.cves_added}</td>
                                            <td className="px-6 py-4 text-right text-blue-400 font-mono">~{job.cves_updated}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
