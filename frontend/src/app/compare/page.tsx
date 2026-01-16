'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, AlertTriangle, Shield, Calendar,
    Target, Zap, Lock, Activity, Award, ExternalLink, ChevronLeft, ChevronRight
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { getCVEDetail, CVEResult } from '@/utils/vulnxApi';

function CompareContent() {
    const searchParams = useSearchParams();
    const [cves, setCves] = useState<CVEResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);

    useEffect(() => {
        const fetchCVEs = async () => {
            const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];

            if (ids.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Fetch all CVEs in parallel
                const validCves = [];
                const errors = [];

                // We fetch one by one or Promise.all. 
                // Since getCVEDetail fetches single CVE, we map it.
                const results = await Promise.allSettled(ids.map(id => getCVEDetail(id)));

                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        validCves.push(result.value);
                    } else {
                        console.error('Failed to fetch CVE:', result.reason);
                    }
                }

                if (validCves.length === 0 && ids.length > 0) {
                    setError('Failed to load any of the selected CVEs.');
                } else {
                    setCves(validCves);
                }
            } catch (err) {
                setError('An unexpected error occurred while loading CVEs.');
            } finally {
                setLoading(false);
            }
        };

        fetchCVEs();
    }, [searchParams]);

    // Check scroll position to show/hide scroll indicators
    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftScroll(scrollLeft > 0);
            setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [cves]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const getSeverityColor = (severity?: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50';
            case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
            case 'low': return 'text-green-400 bg-green-500/20 border-green-500/50';
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-purple-300">Loading comparison data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Error Loading Data</h2>
                <p className="text-red-300 mb-6">{error}</p>
                <Link
                    href="/cve-search"
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Search
                </Link>
            </div>
        );
    }

    if (cves.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Shield className="w-16 h-16 text-gray-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">No CVEs Selected</h2>
                <p className="text-gray-400 mb-6">Please select CVEs from the search page to compare them.</p>
                <Link
                    href="/cve-search"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 font-bold"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Go to Search
                </Link>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Scroll Indicators */}
            {showLeftScroll && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-r-lg shadow-lg transition-all"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            {showRightScroll && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-l-lg shadow-lg transition-all"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            )}

            {/* Comparison Table */}
            <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-purple-900/20"
                style={{ scrollbarWidth: 'thin' }}
            >
                <div className="inline-block min-w-full">
                    <div className="grid gap-0" style={{ gridTemplateColumns: `minmax(200px, 200px) repeat(${cves.length}, minmax(350px, 400px))` }}>

                        {/* Header Row: CVE IDs */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-6 border-b-2 border-purple-500/50 flex items-end font-bold text-purple-300 shadow-xl">
                            METRIC
                        </div>
                        {cves.map((cve, index) => (
                            <div
                                key={cve.cve_id}
                                className={`p-6 border-b-2 border-purple-500/50 bg-gradient-to-br from-purple-900/10 to-pink-900/10 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}
                            >
                                <h2 className="text-2xl font-bold text-white mb-2">{cve.cve_id}</h2>
                                <Link
                                    href={`/cve/${cve.cve_id}`}
                                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                >
                                    View Full Details <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        ))}

                        {/* Severity Row */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 border-b border-purple-500/10 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <AlertTriangle className="w-4 h-4 text-purple-400" /> Severity
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 border-b border-purple-500/10 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getSeverityColor(cve.severity)}`}>
                                    {cve.severity?.toUpperCase() || 'UNKNOWN'}
                                </span>
                            </div>
                        ))}

                        {/* CVSS Score */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 border-b border-purple-500/10 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <Target className="w-4 h-4 text-purple-400" /> CVSS Score
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 border-b border-purple-500/10 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-white">
                                        {cve.cvss_score?.toFixed(1) || 'N/A'}
                                    </div>
                                    {cve.cvss_score && (
                                        <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                                style={{ width: `${(cve.cvss_score / 10) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* EPSS Score */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 border-b border-purple-500/10 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <Activity className="w-4 h-4 text-purple-400" /> EPSS Probability
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 border-b border-purple-500/10 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                {cve.epss_score ? (
                                    <div className="text-lg font-mono text-cyan-300">
                                        {(cve.epss_score * 100).toFixed(2)}%
                                    </div>
                                ) : (
                                    <span className="text-gray-500">N/A</span>
                                )}
                            </div>
                        ))}

                        {/* Flags (KEV, PoC, etc) */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 border-b border-purple-500/10 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <Award className="w-4 h-4 text-purple-400" /> Key Indicators
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 border-b border-purple-500/10 space-y-2 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                {cve.is_kev && (
                                    <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded w-fit">
                                        <Award className="w-4 h-4" /> KEV (Exploited)
                                    </div>
                                )}
                                {cve.is_poc && (
                                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-2 py-1 rounded w-fit">
                                        <Lock className="w-4 h-4" /> PoC Available
                                    </div>
                                )}
                                {cve.is_remote && (
                                    <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-2 py-1 rounded w-fit">
                                        <Zap className="w-4 h-4" /> Remote Exploit
                                    </div>
                                )}
                                {!cve.is_kev && !cve.is_poc && !cve.is_remote && (
                                    <span className="text-gray-500 italic">No special flags</span>
                                )}
                            </div>
                        ))}

                        {/* Published Date */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 border-b border-purple-500/10 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <Calendar className="w-4 h-4 text-purple-400" /> Published
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 border-b border-purple-500/10 text-gray-300 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                {cve.published_at?.split('T')[0] || 'Unknown'}
                            </div>
                        ))}

                        {/* Description */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 border-b border-purple-500/10 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <Shield className="w-4 h-4 text-purple-400" /> Description
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 border-b border-purple-500/10 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                <p className="text-gray-300 text-sm leading-relaxed max-h-60 overflow-y-auto pr-2 hover:text-white transition-colors">
                                    {cve.description}
                                </p>
                            </div>
                        ))}

                        {/* Affected Products (Summary) */}
                        <div className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur z-10 p-4 font-semibold text-gray-300 flex items-center gap-2 shadow-lg">
                            <Activity className="w-4 h-4 text-purple-400" /> Top Targets
                        </div>
                        {cves.map((cve, index) => (
                            <div key={cve.cve_id} className={`p-4 ${index > 0 ? 'border-l border-purple-500/20' : ''}`}>
                                <div className="flex flex-wrap gap-2">
                                    {cve.affected_products && cve.affected_products.slice(0, 5).map((prod: any, i) => (
                                        <span key={i} className="px-2 py-1 bg-white/5 border border-purple-500/20 rounded text-xs text-gray-300">
                                            {prod.vendor || ''} {prod.product || ''}
                                        </span>
                                    ))}
                                    {cve.affected_products && cve.affected_products.length > 5 && (
                                        <span className="text-xs text-gray-500 self-center">+{cve.affected_products.length - 5} more</span>
                                    )}
                                </div>
                            </div>
                        ))}

                    </div>
                </div>
            </div>

            {/* Scroll Hint */}
            {cves.length > 2 && (
                <div className="text-center mt-4 text-sm text-purple-300/70">
                    💡 Use the arrows or scroll horizontally to see all {cves.length} CVEs
                </div>
            )}
        </div>
    );
}

export default function ComparePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />
            <main className="container mx-auto px-6 py-8 max-w-[1600px]">
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/cve-search"
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">CVE Comparison</h1>
                        <p className="text-purple-300">Side-by-side analysis of vulnerabilities</p>
                    </div>
                </div>

                <div className="bg-black/20 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl">
                    <Suspense fallback={
                        <div className="p-12 text-center text-white">Loading comparison...</div>
                    }>
                        <CompareContent />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
