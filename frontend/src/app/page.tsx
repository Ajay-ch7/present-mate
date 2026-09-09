import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, Presentation, FileText } from "lucide-react";

// Enhanced landing page with optimized UI components
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-cream-50 text-slate-900 overflow-hidden relative">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-glow"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-glow" style={{animationDelay: '1s'}}></div>

      <header className="px-6 py-4 flex items-center justify-between border-b border-teal-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-extrabold text-xl text-teal-700 tracking-tight">
          <div className="bg-teal-600 p-1.5 rounded-lg">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <span>PresentMate</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-teal-800 hover:text-teal-900 hover:bg-teal-50 font-medium">Log in</Button>
          </Link>
          <Link href="/login?tab=register">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all border-none font-medium">Sign Up</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 z-10">
        <div className="max-w-4xl space-y-8 animate-fade-in-up">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl text-slate-900 leading-[1.1]">
            Your Real-time AI <br className="hidden sm:inline" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
              Presentation Assistant
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
            Upload your slides, get AI-generated speaking points, and receive context-aware answers to audience questions—live while you present.
          </p>
          <div className="flex items-center justify-center gap-4 pt-6 animate-fade-in-up" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6 bg-teal-600 hover:bg-teal-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-600/20 transition-all duration-300 border-none font-semibold rounded-xl">
                Get Started Free
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 mt-24 text-left">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-teal-50 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group opacity-0 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
              <div className="bg-teal-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 transition-colors duration-300">
                <FileText className="w-7 h-7 text-teal-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">Automated Summaries</h3>
              <p className="text-slate-600 leading-relaxed">Instantly extract key talking points and likely audience questions from your PPT/PDF slides.</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-teal-50 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group opacity-0 animate-fade-in-up" style={{animationDelay: '0.7s'}}>
              <div className="bg-teal-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 transition-colors duration-300">
                <Presentation className="w-7 h-7 text-teal-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">Presenter Overlay</h3>
              <p className="text-slate-600 leading-relaxed">A minimal Chrome extension overlay providing confidence cues right where you need them.</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-teal-50 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group opacity-0 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
              <div className="bg-teal-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 transition-colors duration-300">
                <Mic className="w-7 h-7 text-teal-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">Live Q&A Support</h3>
              <p className="text-slate-600 leading-relaxed">Listen to audience questions in real-time and magically see context-based hint cards matched to your slides.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
