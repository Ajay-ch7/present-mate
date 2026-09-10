"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Search, Copy, CheckCheck, PlayCircle, Presentation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default function PresentationDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sessionStarting, setSessionStarting] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/presentations/${id}`);
        setData(res.data);
        
        // If still processing, poll every 3 seconds
        if (res.data.processing_status !== "ready" && res.data.processing_status !== "failed") {
            setLoading(false);
            interval = setTimeout(fetchDetails, 3000) as unknown as NodeJS.Timeout;
        } else {
            setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchDetails();
    
    return () => clearTimeout(interval);
  }, [id]);

  if (loading && !data) return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center text-teal-600">
      <Loader2 className="w-10 h-10 animate-spin mb-4" />
      <p className="font-medium animate-pulse">Loading presentation details...</p>
    </div>
  );
  if (!data) return <div className="min-h-screen bg-cream-50 p-12 text-center text-slate-500 font-medium">Presentation not found.</div>;

  const filteredSlides = data.slides?.filter((slide: any) => 
    slide.raw_text.toLowerCase().includes(search.toLowerCase()) || 
    slide.summary.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleCopy = () => {
    if (!activeSessionId) return;
    navigator.clipboard.writeText(activeSessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartSession = async () => {
    try {
      setSessionStarting(true);
      const userId = localStorage.getItem("user_id");
      const res = await api.post("/sessions/start", {
        user_id: userId,
        presentation_id: id
      });
      setActiveSessionId(res.data.session_id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert("Failed to start session.");
    } finally {
      setSessionStarting(false);
    }
  };

  const handleStopSession = async () => {
    try {
      if (!activeSessionId) return;
      await api.post(`/sessions/${activeSessionId}/end`);
      window.postMessage({ type: "STOP_PRESENTMATE_SESSION" }, "*");
      setActiveSessionId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to stop session.");
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-slate-900 font-sans pb-20 relative">
      <ScrollProgress />
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 px-3 py-2 rounded-lg transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        <div className="flex gap-4">
          {!activeSessionId ? (
            <Button 
              disabled={data.processing_status !== "ready" || sessionStarting}
              onClick={handleStartSession}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all rounded-lg font-semibold border-none disabled:opacity-50"
            >
              {sessionStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              {sessionStarting ? "Starting..." : "Start Slide Session"}
            </Button>
          ) : (
            <Button 
              onClick={handleStopSession}
              className="bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg transition-all rounded-lg font-semibold border-none"
            >
              Stop Session
            </Button>
          )}
        </div>
      </header>

      {/* Modern Floating Session ID Banner */}
      {activeSessionId && (
        <div className="max-w-6xl mx-auto mt-6 px-6 animate-fade-in-up">
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 p-4 rounded-xl shadow-sm flex items-center justify-between flex-wrap gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse-glow"></div>
            <div className="z-10 flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-full hidden sm:block">
                <Presentation className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-sm md:text-base font-bold text-teal-900">Session active. Paste this ID into your PresentMate Extension:</span>
            </div>
            <div className="z-10 flex items-center gap-2 bg-white border border-teal-300 rounded-xl px-4 py-2 shadow-sm">
              <code className="text-sm font-mono font-bold text-teal-700 select-all">{activeSessionId}</code>
              <button
                onClick={handleCopy}
                className="ml-2 p-1.5 rounded-md hover:bg-teal-100 text-teal-600 transition-colors"
                title="Copy Session ID"
              >
                {copied ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-6 mt-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-teal-50 mb-8 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-3 truncate max-w-2xl">{data.title}</h1>
            <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
              <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">{data.total_slides} slides</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                Status: 
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${data.processing_status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {data.processing_status}
                </span>
              </span>
            </div>
          </div>
          {data.processing_status === "processing" && (
            <div className="flex items-center text-sm text-teal-700 bg-teal-50 border border-teal-100 px-4 py-3 rounded-xl font-bold shadow-sm animate-pulse-glow">
              <Loader2 className="w-5 h-5 animate-spin mr-3 text-teal-500" /> AI is generating summaries, this may take a minute...
            </div>
          )}
        </div>

        {data.slides && data.slides.length > 0 && (
          <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Slide Insights</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 font-bold" />
                <Input 
                  placeholder="Search slides..." 
                  className="pl-10 bg-white border-teal-100 focus-visible:ring-teal-500 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-6">
              {filteredSlides.map((slide: any, idx: number) => (
                <ScrollReveal 
                  key={slide.slide_number}
                  animation="fade-up"
                  delay={(idx % 4) * 60}
                >
                  <div 
                    className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-teal-50 hover:shadow-xl hover:border-teal-200 hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row gap-6 md:gap-8 group"
                  >
                    <div className="flex-shrink-0 w-16 h-16 md:w-24 md:h-24 bg-cream-50 rounded-2xl flex items-center justify-center border-2 border-cream-100 text-teal-600 font-black text-2xl md:text-3xl group-hover:bg-teal-50 group-hover:border-teal-200 transition-colors shadow-inner">
                      {slide.slide_number}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-800 mb-2 uppercase tracking-wide text-xs text-teal-600">Slide Summary</h3>
                      <p className="text-slate-700 mb-6 text-base leading-relaxed font-medium">{slide.summary || "No summary available."}</p>
                      
                      <div className="grid md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 mb-3 uppercase tracking-wider text-teal-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Key Talking Points
                          </h4>
                          <ul className="list-disc leading-relaxed pl-5 text-sm md:text-base text-slate-600 space-y-2 marker:text-emerald-500 font-medium">
                            {slide.key_points?.map((pt: string, idx: number) => (
                              <li key={idx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 mb-3 uppercase tracking-wider text-amber-600 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div> Likely Audience Questions
                          </h4>
                          <ul className="list-disc leading-relaxed pl-5 text-sm md:text-base text-slate-600 space-y-2 marker:text-amber-500 font-medium">
                            {slide.likely_questions?.map((q: string, idx: number) => (
                              <li key={idx} className="italic text-slate-700">"{q}"</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            
            {filteredSlides.length === 0 && search && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-teal-200 text-slate-500">
                No slides match your search query.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
