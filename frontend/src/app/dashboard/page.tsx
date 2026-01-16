"use client";

import React, { useEffect, useState } from 'react';
import { getDashboardStats, DashboardStats } from '@/utils/vulnxApi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Shield,
    AlertTriangle,
    Zap,
    Globe,
    Activity,
    Calendar,
    Loader2
} from 'lucide-react';
import Navigation from '@/components/Navigation';

const COLORS = {
    critical: '#ef4444', // Red-500
    high: '#f97316',     // Orange-500
    medium: '#eab308',   // Yellow-500
    low: '#3b82f6',      // Blue-500
    info: '#94a3b8'      // Slate-400
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
                <Navigation />
                <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                    <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Failed to load dashboard</h2>
                        <p className="text-red-300">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const severityData = [
        { name: 'Critical', value: stats.severity_distribution.critical, color: COLORS.critical },
        { name: 'High', value: stats.severity_distribution.high, color: COLORS.high },
        { name: 'Medium', value: stats.severity_distribution.medium, color: COLORS.medium },
        { name: 'Low', value: stats.severity_distribution.low, color: COLORS.low },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />
            <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            Threat Landscape
                        </h1>
                        <p className="text-gray-400 mt-2">Real-time vulnerability statistics and trends</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <Activity className="w-4 h-4" />
                        Updated: {new Date(stats.updated_at).toLocaleString()}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Total CVEs"
                        value={stats.total_cves}
                        icon={<Shield className="w-6 h-6 text-purple-400" />}
                        trend="Global Database"
                    />
                    <KpiCard
                        title="Exploited (KEV)"
                        value={stats.kev_count}
                        icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
                        trend={(stats.total_cves > 0 ? ((stats.kev_count / stats.total_cves) * 100).toFixed(2) : '0.00') + '% of total'}
                    />
                    <KpiCard
                        title="Has POC"
                        value={stats.poc_count}
                        icon={<Zap className="w-6 h-6 text-yellow-500" />}
                        trend="Proof of Concept available"
                    />
                    <KpiCard
                        title="Remote Exploits"
                        value={stats.remote_count}
                        icon={<Globe className="w-6 h-6 text-blue-400" />}
                        trend="Remotely exploitable"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Severity Distribution */}
                    <div className="p-6 bg-slate-900/50 border border-purple-500/20 rounded-xl backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-400" />
                            Severity Distribution
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Yearly Trend */}
                    <div className="p-6 bg-slate-900/50 border border-purple-500/20 rounded-xl backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-pink-400" />
                            CVEs by Year (Last 15 Years)
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.yearly_trends}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="year" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Bar dataKey="count" name="Vulnerabilities" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon, trend }: { title: string; value: number; icon: React.ReactNode; trend: string }) {
    return (
        <div className="p-6 bg-slate-900/50 border border-purple-500/20 rounded-xl backdrop-blur-sm hover:border-purple-500/40 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    {icon}
                </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <div className="text-3xl font-bold text-white mb-2">{value.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{trend}</p>
        </div>
    );
}
