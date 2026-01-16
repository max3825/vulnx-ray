'use client';

import Link from 'next/link';
import { Terminal, Shield, Zap, Database, Lock, History as HistoryIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            {/* Hero Section */}
            <main className="container-custom py-20">
                <div className="text-center max-w-5xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-8 backdrop-blur-sm">
                        <Zap className="w-4 h-4 text-purple-300" />
                        <span className="text-sm font-medium text-purple-200">
                            Penetration Testing Suite
                        </span>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 animate-fade-in">
                        VulnX-Ray
                        <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mt-2">
                            CVE Intelligence Platform
                        </span>
                    </h1>

                    <p className="text-xl text-purple-200 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Plateforme de recherche et d&apos;analyse de vulnérabilités CVE.
                        Recherchez dans une base de données de 250 000+ CVEs avec filtres avancés et exports.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
                        <Link
                            href="/cve-search"
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-lg rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
                        >
                            <Terminal className="w-6 h-6" />
                            CVE Intelligence Search
                        </Link>
                        <a
                            href="http://localhost:8000/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-lg rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-sm border border-white/20"
                        >
                            <Database className="w-6 h-6" />
                            API Documentation
                        </a>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        {/* Feature 1 */}
                        <div className="group p-8 bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-2xl hover:bg-white/10 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Terminal className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                CVE Intelligence Search
                            </h3>
                            <p className="text-purple-200 text-sm leading-relaxed">
                                Recherchez parmi 250 000+ CVEs avec des filtres avancés : sévérité, score CVSS,
                                KEV, PoC disponible, et plus.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 bg-white/5 backdrop-blur-sm border border-pink-500/20 rounded-2xl hover:bg-white/10 hover:border-pink-500/40 transition-all duration-300 hover:scale-105">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                Vulnerability Analytics
                            </h3>
                            <p className="text-purple-200 text-sm leading-relaxed">
                                Analysez les tendances de sécurité avec des statistiques en temps réel :
                                CVEs critiques, vulnérabilités exploitées (KEV), et plus.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-2xl hover:bg-white/10 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Database className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                Data Export
                            </h3>
                            <p className="text-purple-200 text-sm leading-relaxed">
                                Exportez vos résultats de recherche en CSV ou JSON.
                                Intégration facile avec vos outils de sécurité existants.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="group p-8 bg-white/5 backdrop-blur-sm border border-pink-500/20 rounded-2xl hover:bg-white/10 hover:border-pink-500/40 transition-all duration-300 hover:scale-105">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <HistoryIcon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                Saved Searches & History
                            </h3>
                            <p className="text-purple-200 text-sm leading-relaxed">
                                Sauvegardez vos requêtes complexes et accédez à votre historique de recherche.
                                Gagnez du temps sur vos veilles de sécurité.
                            </p>
                        </div>
                    </div>

                    {/* Command Examples */}
                    <div className="mt-20 p-8 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl">
                        <h3 className="text-2xl font-bold text-white mb-6">
                            🎯 Exemples de Recherches
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4 text-left">
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <code className="text-purple-300 text-sm font-mono">query: &quot;wordpress&quot;</code>
                                <p className="text-purple-200 text-xs mt-2">Rechercher toutes les CVE WordPress</p>
                            </div>
                            <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                                <code className="text-pink-300 text-sm font-mono">severity: CRITICAL + is_kev: true</code>
                                <p className="text-purple-200 text-xs mt-2">CVEs critiques exploitées</p>
                            </div>
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <code className="text-purple-300 text-sm font-mono">cvss_score ≥ 9.0 + is_poc: true</code>
                                <p className="text-purple-200 text-xs mt-2">Score élevé avec PoC disponible</p>
                            </div>
                            <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                                <code className="text-pink-300 text-sm font-mono">cve_year: 2025 + is_remote: true</code>
                                <p className="text-purple-200 text-xs mt-2">Vulnérabilités récentes exploitables à distance</p>
                            </div>
                        </div>
                    </div>

                    {/* Legal Disclaimer */}
                    <div className="mt-16 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
                        <h4 className="font-bold text-yellow-400 mb-2 flex items-center gap-2 justify-center">
                            <Lock className="w-5 h-5" />
                            ⚠️ Avertissement Légal
                        </h4>
                        <p className="text-sm text-yellow-200/90">
                            Cette plateforme fournit des informations sur les vulnérabilités à des fins de recherche et de sécurité.
                            Ces informations doivent être utilisées de manière responsable et uniquement sur des systèmes que vous
                            possédez ou pour lesquels vous avez une autorisation explicite. Les développeurs ne sont pas responsables
                            de l&apos;utilisation abusive de ces informations.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-purple-500/20 mt-20 bg-black/30">
                <div className="container-custom py-8">
                    <div className="text-center text-sm text-purple-300">
                        <p>VulnX-Ray v3.0.0 - CVE Intelligence Platform</p>
                        <p className="mt-2 text-purple-400">© 2026 Security Research. For authorized testing only.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
