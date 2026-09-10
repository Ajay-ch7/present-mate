"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Presentation, Plus, LogOut, ArrowRight, FileSignature } from "lucide-react";
import Link from "next/link";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default function DashboardPage() {
  const [presentations, setPresentations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPresentations = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      try {
        const res = await api.get(`/presentations/?user_id=${userId}`);
        setPresentations(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPresentations();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-cream-50 font-sans text-slate-900 relative">
      <ScrollProgress />
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 font-extrabold text-xl text-teal-700 tracking-tight">
          <div className="bg-teal-600 p-1.5 rounded-lg">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <span>PresentMate Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/upload">
            <Button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md hover:shadow-lg transition-all rounded-lg font-medium">
              <Plus className="w-4 h-4" /> Upload
            </Button>
          </Link>
          <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <ScrollReveal animation="fade-up">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Your Presentations</h1>
              <p className="text-slate-500 font-medium text-lg">Manage and review your AI-processed slide decks.</p>
            </div>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
             {[1,2,3].map(i => (
               <div key={i} className="bg-white p-6 rounded-2xl border border-teal-50 shadow-sm h-48 animate-pulse rounded-xl"></div>
             ))}
          </div>
        ) : presentations.length === 0 ? (
          <ScrollReveal animation="zoom-in">
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-teal-200 shadow-sm">
              <div className="bg-teal-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Presentation className="w-10 h-10 text-teal-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">No presentations yet</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto line-height-relaxed">Upload your first PPTX or PDF to let AI instantly extract key talking points and anticipate audience questions.</p>
              <Link href="/upload">
                <Button size="lg" className="bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:-translate-y-1 transition-all rounded-xl font-semibold px-8 py-6 text-lg border-none text-white">
                  Upload Presentation
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((p, idx) => (
              <ScrollReveal 
                key={p._id} 
                animation="fade-up" 
                delay={(idx % 6) * 70}
              >
                <div 
                  className="bg-white p-6 rounded-2xl border border-teal-50 shadow-sm hover:shadow-xl hover:border-teal-200 hover:-translate-y-1 transition-all duration-300 flex flex-col group h-full justify-between"
                >
                  <div className="flex-1 mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-cream-100 p-3 rounded-xl border border-cream-200 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
                        <FileSignature className="w-6 h-6 text-teal-600" />
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${p.processing_status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} capitalize shadow-sm`}>
                        {p.processing_status}
                      </span>
                    </div>
                    <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-teal-700 transition-colors" title={p.title}>{p.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{p.file_type.includes("pdf") ? "PDF" : "PPTX"}</span>
                      <span>•</span>
                      <span>{new Date(p.upload_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    </div>
                  </div>
                  <Link href={`/presentation/${p._id}`}>
                    <Button variant="outline" className="w-full flex items-center justify-between border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-all rounded-xl py-6 font-semibold shadow-sm">
                      View Details <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
