"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, Terminal, Search, Server, Database } from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
            <nav className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                VulnX-Ray
                            </span>
                            <div className="text-xs text-purple-300">CVE Intelligence</div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link
                            href="/dashboard"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <Link
                            href="/cve-search"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/cve-search') ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Search className="w-4 h-4" />
                            Search
                        </Link>
                        <Link
                            href="/nuclei-scan"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/nuclei-scan') ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Nuclei Scan
                        </Link>
                        <Link
                            href="/assets"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/assets') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Database className="w-4 h-4" />
                            Assets
                        </Link>
                        <Link
                            href="/alerts"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/alerts') ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <span className="relative">
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                <Terminal className="w-4 h-4" />
                                {/* Using Terminal icon for now, later import Bell if needed or use existing icons */}
                            </span>
                            Alerts
                        </Link>
                        <Link
                            href="/api-docs"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/api-docs') ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Terminal className="w-4 h-4" />
                            API Docs
                        </Link>
                        <Link
                            href="/admin/sources"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/admin/sources') ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Server className="w-4 h-4" />
                            Data Sources
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    );
}
