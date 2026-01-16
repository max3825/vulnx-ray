'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Shield,
    AlertTriangle,
    Calendar,
    ExternalLink,
    Package,
    TrendingUp,
    FileText,
    Zap,
    ArrowLeft,
    Activity,
    Target,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { getCVEDetail, CVEResult } from '@/utils/vulnxApi';

export default function CVEDetailPage() {
    const params = useParams();
    const router = useRouter();
    const cveId = params.id as string;

    const [cve, setCVE] = useState<CVEResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCVEDetail = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getCVEDetail(cveId);
                setCVE(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load CVE details');
            } finally {
                setLoading(false);
            }
        };

        if (cveId) {
            fetchCVEDetail();
        }
    }, [cveId]);

    const getSeverityColor = (severity: string) => {
        const severityLower = severity.toLowerCase();
        if (severityLower === 'critical') return 'from-red-600 to-red-800';
        if (severityLower === 'high') return 'from-orange-600 to-orange-800';
        if (severityLower === 'medium') return 'from-yellow-600 to-yellow-800';
        return 'from-blue-600 to-blue-800';
    };

    const getSeverityBorderColor = (severity: string) => {
        const severityLower = severity.toLowerCase();
        if (severityLower === 'critical') return 'border-red-500/50';
        if (severityLower === 'high') return 'border-orange-500/50';
        if (severityLower === 'medium') return 'border-yellow-500/50';
        return 'border-blue-500/50';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading CVE details...</p>
                </div>
            </div>
        );
    }

    if (error || !cve) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-red-500/30 p-8 max-w-md w-full">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white text-center mb-2">Error Loading CVE</h2>
                    <p className="text-gray-300 text-center mb-6">{error || 'CVE not found'}</p>
                    <button
                        onClick={() => router.push('/cve-search')}
                        className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/cve-search')}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm text-white rounded-lg border border-purple-500/30 hover:bg-slate-700/50 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Search
                </button>

                {/* Header Card */}
                <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg border ${getSeverityBorderColor(cve.severity)} p-8 mb-6`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <Shield className="w-8 h-8 text-purple-400" />
                                <h1 className="text-4xl font-bold text-white">{cve.cve_id}</h1>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`px-3 py-1 bg-gradient-to-r ${getSeverityColor(cve.severity)} text-white rounded-full text-sm font-semibold`}>
                                    {cve.severity.toUpperCase()}
                                </span>
                                {(cve.cvss_score !== undefined && cve.cvss_score !== null) && (
                                    <span className="px-3 py-1 bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded-full text-sm font-semibold">
                                        CVSS {cve.cvss_score.toFixed(1)}
                                    </span>
                                )}
                                {cve.is_kev && (
                                    <span className="px-3 py-1 bg-red-600/30 border border-red-500/50 text-red-300 rounded-full text-sm font-semibold flex items-center gap-1">
                                        <Target className="w-3 h-3" />
                                        KEV
                                    </span>
                                )}
                                {cve.has_poc && (
                                    <span className="px-3 py-1 bg-orange-600/30 border border-orange-500/50 text-orange-300 rounded-full text-sm font-semibold flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        PoC Available
                                    </span>
                                )}
                                {cve.has_nuclei_template && (
                                    <span className="px-3 py-1 bg-green-600/30 border border-green-500/50 text-green-300 rounded-full text-sm font-semibold flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        Nuclei Template
                                    </span>
                                )}
                                {cve.has_remote_exploit && (
                                    <span className="px-3 py-1 bg-yellow-600/30 border border-yellow-500/50 text-yellow-300 rounded-full text-sm font-semibold flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        Remote Exploit
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="flex gap-6 text-sm">
                        {(cve.published_date || cve.published_at) && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                <span>Published: {new Date(cve.published_date || cve.published_at || '').toLocaleDateString()}</span>
                            </div>
                        )}
                        {(cve.modified_date || cve.updated_at) && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <Calendar className="w-4 h-4 text-pink-400" />
                                <span>Modified: {new Date(cve.modified_date || cve.updated_at || '').toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-purple-400" />
                                Description
                            </h2>
                            <p className="text-gray-300 leading-relaxed">{cve.description}</p>
                        </div>

                        {/* Affected Products */}
                        {cve.affected_products && cve.affected_products.length > 0 && (
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 p-6">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Package className="w-6 h-6 text-purple-400" />
                                    Affected Products
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {cve.affected_products.map((product, index) => (
                                        <div
                                            key={index}
                                            className="px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300"
                                        >
                                            {typeof product === 'string' ? product : (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white">{product.vendor}</span>
                                                    <span className="text-sm">{product.product}</span>
                                                    {product.version && <span className="text-xs text-purple-400">v{product.version}</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* References */}
                        {cve.references && cve.references.length > 0 && (
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 p-6">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <ExternalLink className="w-6 h-6 text-purple-400" />
                                    References
                                </h2>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {cve.references.map((ref, index) => (
                                        <a
                                            key={index}
                                            href={ref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-purple-500/20 hover:border-purple-500/40 rounded-lg text-purple-300 hover:text-purple-200 transition-all text-sm break-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{ref}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="space-y-6">
                        {/* CVSS Metrics */}
                        {(cve.cvss_score !== undefined && cve.cvss_score !== null) && (
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 p-6">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                    CVSS Metrics
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-400 text-sm">Score</span>
                                            <span className="text-2xl font-bold text-white">{cve.cvss_score.toFixed(1)}</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${getSeverityColor(cve.severity)}`}
                                                style={{ width: `${(cve.cvss_score / 10) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    {cve.cvss_vector && (
                                        <div>
                                            <span className="text-gray-400 text-sm block mb-2">Vector</span>
                                            <code className="block px-3 py-2 bg-slate-900/50 border border-purple-500/20 rounded text-purple-300 text-xs break-all">
                                                {cve.cvss_vector}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Risk Indicators */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-purple-400" />
                                Risk Indicators
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">KEV Listed</span>
                                    {cve.is_kev ? (
                                        <CheckCircle className="w-5 h-5 text-red-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">PoC Available</span>
                                    {cve.has_poc ? (
                                        <CheckCircle className="w-5 h-5 text-orange-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">Nuclei Template</span>
                                    {cve.has_nuclei_template ? (
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">Remote Exploit</span>
                                    {cve.has_remote_exploit ? (
                                        <CheckCircle className="w-5 h-5 text-yellow-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">CISA Actionable</span>
                                    {cve.cisa_actionable ? (
                                        <CheckCircle className="w-5 h-5 text-red-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                {cve.epss_score !== undefined && cve.epss_score !== null && (
                                    <div className="pt-3 border-t border-purple-500/20">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300 text-sm">EPSS Score</span>
                                            <span className="text-white font-semibold">{(cve.epss_score * 100).toFixed(2)}%</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Probability of exploitation</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* External Links */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 p-6">
                            <h2 className="text-xl font-bold text-white mb-4">External Resources</h2>
                            <div className="space-y-2">
                                <a
                                    href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all text-center"
                                >
                                    View in NVD
                                </a>
                                <a
                                    href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve.cve_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all text-center"
                                >
                                    View in MITRE
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
