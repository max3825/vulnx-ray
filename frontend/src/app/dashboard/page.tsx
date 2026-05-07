"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardStats, DashboardStats, searchCVEs, CVEResult } from '@/utils/vulnxApi';
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
    Cell,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import {
    Shield,
    AlertTriangle,
    Zap,
    Globe,
    Activity,
    Calendar,
    Loader2,
    TrendingUp,
    Target,
    Clock,
    RefreshCw,
    Download
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
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [recentCVEs, setRecentCVEs] = useState<CVEResult[]>([]);

    const fetchStats = async () => {
        try {
            setIsRefreshing(true);
            const data = await getDashboardStats();
            setStats(data);
            setLastUpdated(new Date());

            // Temporarily disabled - search API is too slow
            // Fetch recent critical/high CVEs
            /*
            try {
                const recentData = await searchCVEs({
                    severity: ['critical'],
                    limit: 3
                });
                setRecentCVEs(recentData.results);
            } catch (err) {
                console.error('Failed to fetch recent CVEs:', err);
                // Continue even if recent CVEs fail
            }
            */
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load stats');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();

        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    // Separate effect for recent CVEs - loads async without blocking dashboard
    useEffect(() => {
        const fetchRecentCVEs = async () => {
            try {
                const recentData = await searchCVEs({
                    severity: ['critical'],
                    limit: 3
                });
                setRecentCVEs(recentData.results);
            } catch (err) {
                console.error('Failed to fetch recent CVEs:', err);
            }
        };

        // Load after a small delay so dashboard renders first
        const timer = setTimeout(fetchRecentCVEs, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleRefresh = () => {
        fetchStats();
    };

    const handleCVEClick = (cveId: string) => {
        router.push(`/cve/${cveId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
                <Navigation />
                <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                        <p className="text-gray-400">Loading threat intelligence...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
                <Navigation />
                <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                    <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-xl text-center max-w-md">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Failed to load dashboard</h2>
                        <p className="text-red-300 mb-4">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
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

    // Calculate additional metrics
    const totalCritical = stats.severity_distribution.critical;
    const averageCVSS = 7.2; // Mock for now - would need backend calculation
    const thisMonthCVEs = Math.floor(stats.total_cves * 0.002); // Mock: ~0.2% of total
    const trendingUp = stats.yearly_trends.length > 1
        ? stats.yearly_trends[stats.yearly_trends.length - 1].count > stats.yearly_trends[stats.yearly_trends.length - 2].count
        : true;

    // Generate mock top vendors data
    const topVendors = [
        { name: 'Microsoft', count: 12543 },
        { name: 'Google', count: 8234 },
        { name: 'Apple', count: 6821 },
        { name: 'Cisco', count: 5432 },
        { name: 'Oracle', count: 4987 },
        { name: 'Adobe', count: 3654 },
        { name: 'IBM', count: 3201 },
        { name: 'Mozilla', count: 2876 },
    ];

    // Mock CVSS distribution
    const cvssDistribution = [
        { range: '0-2', count: 15234 },
        { range: '2-4', count: 45632 },
        { range: '4-6', count: 89543 },
        { range: '6-8', count: 102341 },
        { range: '8-10', count: 62214 },
    ];

    // Dynamic monthly trend — last 12 months ending at the current month
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const currentMonthName = MONTH_NAMES[now.getMonth()];
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return {
            month: MONTH_NAMES[d.getMonth()],
            // Mock counts — last month closest to current has highest value
            count: 2543 + Math.floor((i / 11) * 2580 + Math.sin(i) * 300),
        };
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />
            <div className="pt-8 pb-12 px-6 max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
                            Threat Intelligence Dashboard
                        </h1>
                        <p className="text-gray-400 mt-2 text-lg">Real-time vulnerability monitoring and analytics</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                            <Clock className="w-4 h-4" />
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg border border-purple-500/30 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 rounded-lg border border-pink-500/30 transition-all">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* KPI Cards - Now 8 cards in 4 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AnimatedKpiCard
                        title="Total CVEs"
                        value={stats.total_cves}
                        icon={<Shield className="w-6 h-6 text-purple-400" />}
                        trend="Global Database"
                        gradientFrom="from-purple-600/20"
                        gradientTo="to-purple-900/20"
                        delay={0}
                    />
                    <AnimatedKpiCard
                        title="Critical Severity"
                        value={totalCritical}
                        icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
                        trend={(stats.total_cves > 0 ? ((totalCritical / stats.total_cves) * 100).toFixed(2) : '0.00') + '% of total'}
                        gradientFrom="from-red-600/20"
                        gradientTo="to-red-900/20"
                        delay={0.1}
                    />
                    <AnimatedKpiCard
                        title="Known Exploited"
                        value={stats.kev_count}
                        icon={<Zap className="w-6 h-6 text-yellow-500" />}
                        trend="CISA KEV Catalog"
                        gradientFrom="from-yellow-600/20"
                        gradientTo="to-yellow-900/20"
                        delay={0.2}
                    />
                    <AnimatedKpiCard
                        title="Has POC"
                        value={stats.poc_count}
                        icon={<Target className="w-6 h-6 text-orange-500" />}
                        trend="Proof of Concept"
                        gradientFrom="from-orange-600/20"
                        gradientTo="to-orange-900/20"
                        delay={0.3}
                    />
                    <AnimatedKpiCard
                        title="Remote Exploits"
                        value={stats.remote_count}
                        icon={<Globe className="w-6 h-6 text-blue-400" />}
                        trend="Network Accessible"
                        gradientFrom="from-blue-600/20"
                        gradientTo="to-blue-900/20"
                        delay={0.4}
                    />
                    <AnimatedKpiCard
                        title="This Month"
                        value={thisMonthCVEs}
                        icon={<Calendar className="w-6 h-6 text-cyan-400" />}
                        trend={`Published in ${currentMonthName}`}
                        gradientFrom="from-cyan-600/20"
                        gradientTo="to-cyan-900/20"
                        delay={0.5}
                    />
                    <AnimatedKpiCard
                        title="Average CVSS"
                        value={averageCVSS}
                        icon={<Activity className="w-6 h-6 text-pink-400" />}
                        trend="Severity Score"
                        gradientFrom="from-pink-600/20"
                        gradientTo="to-pink-900/20"
                        delay={0.6}
                        isDecimal
                    />
                    <AnimatedKpiCard
                        title={trendingUp ? "Trending Up" : "Trending Down"}
                        value={stats.yearly_trends[stats.yearly_trends.length - 1]?.count || 0}
                        icon={<TrendingUp className={`w-6 h-6 ${trendingUp ? 'text-green-400' : 'text-red-400'}`} />}
                        trend={`vs ${stats.yearly_trends[stats.yearly_trends.length - 2]?.count || 0} last year`}
                        gradientFrom="from-green-600/20"
                        gradientTo="to-green-900/20"
                        delay={0.7}
                    />
                </div>

                {/* First Row of Charts - 3 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Severity Distribution */}
                    <ChartCard title="Severity Distribution" icon={<Activity className="w-5 h-5 text-purple-400" />}>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={severityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {severityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* CVSS Distribution */}
                    <ChartCard title="CVSS Score Distribution" icon={<Target className="w-5 h-5 text-pink-400" />}>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={cvssDistribution}>
                                <defs>
                                    <linearGradient id="colorCvss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="range" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#ec4899"
                                    fillOpacity={1}
                                    fill="url(#colorCvss)"
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Monthly Trend */}
                    <ChartCard title="Monthly Trend (12 Months)" icon={<Calendar className="w-5 h-5 text-cyan-400" />}>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={monthlyTrend}>
                                <defs>
                                    <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="month" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#06b6d4"
                                    fillOpacity={1}
                                    fill="url(#colorMonth)"
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Second Row - Large charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Yearly Trend */}
                    <ChartCard title="CVEs by Year (Historical Trend)" icon={<TrendingUp className="w-5 h-5 text-green-400" />}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={stats.yearly_trends}>
                                <defs>
                                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="year" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    name="Vulnerabilities"
                                    fill="url(#colorBar)"
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Top Vendors */}
                    <ChartCard title="Top Vendors by CVE Count" icon={<Shield className="w-5 h-5 text-blue-400" />}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={topVendors} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#3b82f6"
                                    radius={[0, 4, 4, 0]}
                                    animationDuration={1000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Recent CVEs Table */}
                <div className="p-6 bg-slate-900/50 border border-purple-500/20 rounded-xl backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Recent Critical CVEs
                        <span className="ml-auto text-sm font-normal text-gray-400">Live Feed</span>
                    </h3>
                    <div className="space-y-3">
                        {recentCVEs?.length && recentCVEs.length > 0 ? recentCVEs.map((cve, index) => (
                            <div
                                key={cve.cve_id}
                                onClick={() => handleCVEClick(cve.cve_id)}
                                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800/70 transition-all cursor-pointer group"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <SeverityBadge severity={cve.severity} />
                                    <div className="flex-1">
                                        <div className="font-mono text-sm text-purple-400 group-hover:text-purple-300 transition-colors">
                                            {cve.cve_id}
                                        </div>
                                        <div className="text-gray-300 text-sm mt-1 line-clamp-1">{cve.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-gray-400">
                                    <div className="text-right">
                                        {cve.cvss_score && (
                                            <div className="text-white font-semibold">CVSS {cve.cvss_score.toFixed(1)}</div>
                                        )}
                                        {cve.published_date && (
                                            <div className="text-xs">{new Date(cve.published_date).toLocaleDateString()}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-gray-400 py-8">
                                No recent critical CVEs found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    );
}

function AnimatedKpiCard({
    title,
    value,
    icon,
    trend,
    gradientFrom,
    gradientTo,
    delay,
    isDecimal = false
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    trend: string;
    gradientFrom: string;
    gradientTo: string;
    delay: number;
    isDecimal?: boolean;
}) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 1000; // 1 second animation
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(current);
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [value]);

    return (
        <div
            className={`p-6 bg-gradient-to-br ${gradientFrom} ${gradientTo} border border-white/10 rounded-xl backdrop-blur-sm hover:border-white/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20`}
            style={{ animationDelay: `${delay}s` }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                    {icon}
                </div>
            </div>
            <h3 className="text-gray-300 text-sm font-medium mb-1">{title}</h3>
            <div className="text-4xl font-bold text-white mb-2">
                {isDecimal ? displayValue.toFixed(1) : Math.floor(displayValue).toLocaleString()}
            </div>
            <p className="text-xs text-gray-400">{trend}</p>
        </div>
    );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="p-6 bg-slate-900/50 border border-purple-500/20 rounded-xl backdrop-blur-sm hover:border-purple-500/40 transition-colors">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const colors = {
        critical: 'bg-red-500/20 text-red-300 border-red-500/50',
        high: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
        medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
        low: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${colors[severity as keyof typeof colors]}`}>
            {severity}
        </span>
    );
}
