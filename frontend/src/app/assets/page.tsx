'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';
import {
    Server, Plus, Trash2, Play, RefreshCw, Tag, Clock,
    CheckCircle2, XCircle, Search, Shield, Edit2, X, Save
} from 'lucide-react';

interface Asset {
    id: number;
    name: string;
    target: string;
    description: string | null;
    tags: string[];
    is_active: boolean;
    created_at: string;
    last_scanned_at: string | null;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editAsset, setEditAsset] = useState<Asset | null>(null);
    const [search, setSearch] = useState('');
    const [scanning, setScanning] = useState<number | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const [form, setForm] = useState({ name: '', target: '', description: '', tags: '' });

    const notify = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/v1/assets');
            if (res.ok) setAssets(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAssets(); }, []);

    const handleSubmit = async () => {
        const payload = {
            name: form.name,
            target: form.target,
            description: form.description || null,
            tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        };
        try {
            let res;
            if (editAsset) {
                res = await apiFetch(`/api/v1/assets/${editAsset.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await apiFetch('/api/v1/assets', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }
            if (!res.ok) throw new Error(await res.text());
            notify('success', editAsset ? '✅ Asset updated' : '✅ Asset created');
            setShowForm(false);
            setEditAsset(null);
            setForm({ name: '', target: '', description: '', tags: '' });
            fetchAssets();
        } catch (e: any) {
            notify('error', `❌ ${e.message}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this asset?')) return;
        const res = await apiFetch(`/api/v1/assets/${id}`, { method: 'DELETE' });
        if (res.ok) { notify('success', '🗑️ Asset deleted'); fetchAssets(); }
        else notify('error', '❌ Delete failed');
    };

    const handleScan = async (asset: Asset) => {
        setScanning(asset.id);
        try {
            const res = await apiFetch(`/api/v1/assets/${asset.id}/scan`, { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            notify('success', `🚀 Scan started — ID: ${data.scan_id?.slice(0, 8)}...`);
            fetchAssets();
        } catch (e: any) {
            notify('error', `❌ Scan failed: ${e.message}`);
        } finally {
            setScanning(null);
        }
    };

    const openEdit = (a: Asset) => {
        setEditAsset(a);
        setForm({ name: a.name, target: a.target, description: a.description || '', tags: (a.tags || []).join(', ') });
        setShowForm(true);
    };

    const filtered = assets.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.target.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Navigation />

            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-md ${notification.type === 'success'
                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : 'bg-red-500/20 border-red-500/40 text-red-300'}`}>
                    {notification.msg}
                </div>
            )}

            <main className="container mx-auto px-6 py-8 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center gap-3">
                            <Server className="w-9 h-9 text-purple-400" />
                            Asset Inventory
                        </h1>
                        <p className="text-slate-400 mt-1">Manage your targets — scan them with one click</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchAssets} className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 transition-colors">
                            <RefreshCw className={`w-5 h-5 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => { setEditAsset(null); setForm({ name: '', target: '', description: '', tags: '' }); setShowForm(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all shadow-lg"
                        >
                            <Plus className="w-4 h-4" />
                            Add Asset
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Total Assets', value: assets.length, color: 'purple' },
                        { label: 'Active', value: assets.filter(a => a.is_active).length, color: 'green' },
                        { label: 'Scanned', value: assets.filter(a => a.last_scanned_at).length, color: 'cyan' },
                    ].map(stat => (
                        <div key={stat.label} className={`p-5 bg-${stat.color}-500/10 border border-${stat.color}-500/30 rounded-xl`}>
                            <div className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</div>
                            <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or target..."
                        className="w-full pl-11 pr-4 py-3 bg-black/40 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                {/* Asset Grid */}
                {loading ? (
                    <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin text-purple-400 mx-auto" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <Server className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">No assets yet. Add your first target!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filtered.map(asset => (
                            <div key={asset.id} className="group bg-black/40 backdrop-blur-md border border-slate-700/50 hover:border-purple-500/50 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-purple-500/10">
                                {/* Title row */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg leading-tight">{asset.name}</h3>
                                        <p className="text-purple-300 text-sm font-mono mt-0.5 truncate">{asset.target}</p>
                                    </div>
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${asset.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                                        {asset.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {/* Description */}
                                {asset.description && (
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{asset.description}</p>
                                )}

                                {/* Tags */}
                                {asset.tags && asset.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {asset.tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-full text-xs flex items-center gap-1">
                                                <Tag className="w-3 h-3" />{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Meta */}
                                <div className="text-xs text-slate-500 mb-5 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {asset.last_scanned_at
                                        ? `Last scanned: ${new Date(asset.last_scanned_at).toLocaleString()}`
                                        : 'Never scanned'}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleScan(asset)}
                                        disabled={scanning === asset.id}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
                                    >
                                        {scanning === asset.id
                                            ? <><RefreshCw className="w-4 h-4 animate-spin" />Scanning…</>
                                            : <><Play className="w-4 h-4" />Scan</>}
                                    </button>
                                    <button
                                        onClick={() => openEdit(asset)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(asset.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">{editAsset ? 'Edit Asset' : 'New Asset'}</h2>
                            <button onClick={() => { setShowForm(false); setEditAsset(null); }} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Name *', key: 'name', placeholder: 'e.g. Production API' },
                                { label: 'Target URL / IP *', key: 'target', placeholder: 'e.g. https://api.example.com' },
                                { label: 'Description', key: 'description', placeholder: 'Optional description' },
                                { label: 'Tags (comma-separated)', key: 'tags', placeholder: 'e.g. prod, web, api' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="text-sm text-slate-300 mb-1 block">{field.label}</label>
                                    <input
                                        value={(form as any)[field.key]}
                                        onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                                        placeholder={field.placeholder}
                                        className="w-full px-4 py-3 bg-black/40 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setShowForm(false); setEditAsset(null); }} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors">Cancel</button>
                            <button
                                onClick={handleSubmit}
                                disabled={!form.name || !form.target}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editAsset ? 'Save Changes' : 'Create Asset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
