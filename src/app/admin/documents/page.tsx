"use client";

import React from "react";
import { BookOpen, Plus, Trash2, FileText, Loader2, Search, Info } from "lucide-react";
import AddDocumentModal from "@/components/admin/modals/AddDocumentModal";

export default function DocumentsPage() {
    const [documents, setDocuments] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const fetchDocuments = async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        void fetchDocuments();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this document from the Knowledge Base? This will also remove all its AI embeddings.")) return;

        try {
            const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDocuments(prev => prev.filter(doc => doc.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete document", error);
        }
    };

    const filteredDocs = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BookOpen className="text-blue-400" />
                        AI Knowledge Base (RAG)
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Supply documentation so the AI can answer chat questions accurately.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} />
                    Add Knowledge
                </button>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4 items-start">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 shrink-0">
                    <Info size={18} />
                </div>
                <div className="text-sm text-slate-300 leading-relaxed">
                    <span className="font-bold text-blue-400">Pro Tip:</span> AI akan memprioritaskan informasi dari dokumen yang Anda unggah di sini sebelum menggunakan pengetahuannya sendiri. Cocok untuk deskripsi produk, FAQ, atau detail kampanye live Anda.
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    placeholder="Cari dokumen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                    <Loader2 size={40} className="animate-spin text-blue-500" />
                    <p className="font-medium">Memuat data pengetahuan...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl text-center px-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 mb-4">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Belum ada pengetahuan</h3>
                    <p className="text-slate-500 max-w-sm">
                        Unggah informasi produk atau panduan lainnya agar AI Anda menjadi lebih pintar saat membalas chat.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc) => (
                        <div 
                            key={doc.id}
                            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-slate-800 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <FileText size={20} />
                                </div>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <h3 className="font-bold text-white line-clamp-1">{doc.title}</h3>
                            <div className="mt-4 flex items-center justify-between text-xs font-medium">
                                <span className={
                                    doc.status === "active" 
                                        ? "text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded-md" 
                                        : "text-amber-400 px-2 py-1 bg-amber-500/10 rounded-md"
                                }>
                                    {doc.status === "active" ? "Aktif" : "Memproses"}
                                </span>
                                <span className="text-slate-500">
                                    {doc._count?.chunks || 0} AI Chunks
                                </span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                                <span>Ditambahkan:</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AddDocumentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchDocuments}
            />
        </div>
    );
}
