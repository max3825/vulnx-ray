'use client';

import Navigation from '@/components/Navigation';
import { Terminal, ExternalLink, Shield, Lock, Zap, Book } from 'lucide-react';

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            <main className="container mx-auto px-6 py-12 max-w-5xl">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold text-white mb-6">
                        VulnX-Ray <span className="text-purple-400">API</span>
                    </h1>
                    <p className="text-xl text-purple-200 max-w-2xl mx-auto">
                        Integrate powerful CVE intelligence and vulnerability scanning capabilities directly into your workflows.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Swagger UI Card */}
                    <div className="bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 hover:bg-white/10 transition-colors group">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Terminal className="w-6 h-6 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Swagger UI</h2>
                        <p className="text-gray-400 mb-6">
                            Interactive API documentation. Test endpoints directly from your browser, explore schemas, and see example responses.
                        </p>
                        <a
                            href="http://localhost:8000/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-green-400 font-bold hover:text-green-300 transition-colors"
                        >
                            Open Swagger UI <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>

                    {/* ReDoc Card */}
                    <div className="bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 hover:bg-white/10 transition-colors group">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Book className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">ReDoc Reference</h2>
                        <p className="text-gray-400 mb-6">
                            Clean, organized API reference documentation. Perfect for reading offline or sharing with your team.
                        </p>
                        <a
                            href="http://localhost:8000/redoc"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors"
                        >
                            Open ReDoc <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Integration Examples */}
                <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-purple-500 pl-4">
                        Quick Integration Examples
                    </h3>

                    {/* Python Example */}
                    <div className="bg-black/40 border border-purple-500/20 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-purple-500/20">
                            <span className="text-sm font-mono text-purple-300">search_cve.py</span>
                            <span className="text-xs text-gray-500">Python 3.x</span>
                        </div>
                        <div className="p-6 font-mono text-sm overflow-x-auto">
                            <pre className="text-gray-300">
                                {`import requests

API_URL = "http://localhost:8000/api/v1/vulnx-search/search"

payload = {
    "query": "wordpress plugin",
    "severity": ["critical", "high"],
    "is_kev": True,
    "limit": 5
}

response = requests.post(API_URL, json=payload)
data = response.json()

print(f"Found {data['total']} CVEs:")
for cve in data['cves']:
    print(f"- {cve['cve_id']}: {cve['severity']}")`}
                            </pre>
                        </div>
                    </div>

                    {/* Curl Example */}
                    <div className="bg-black/40 border border-purple-500/20 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-purple-500/20">
                            <span className="text-sm font-mono text-purple-300">terminal</span>
                            <span className="text-xs text-gray-500">BASH</span>
                        </div>
                        <div className="p-6 font-mono text-sm overflow-x-auto">
                            <pre className="text-gray-300">
                                {`curl -X POST "http://localhost:8000/api/v1/vulnx-search/search" \\
     -H "Content-Type: application/json" \\
     -d '{
           "query": "apache struts",
           "cvss_score_min": 9.0
         }'`}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center text-sm text-gray-500">
                    <p>API Version 3.0.0 • VulnX-Ray Platform</p>
                </div>
            </main>
        </div>
    );
}
