"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  Presentation,
  Mic,
  FileText,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Clock,
  Layers,
  MessageSquare,
  Play,
  Check,
  TrendingUp,
  Volume2
} from "lucide-react";

interface QuestionScenario {
  id: string;
  question: string;
  askedBy: string;
  matchedSlide: string;
  confidence: string;
  answerBullets: string[];
}

const DEMO_SCENARIOS: QuestionScenario[] = [
  {
    id: "churn",
    question: "What specific initiatives drove the 18% reduction in net customer churn this quarter?",
    askedBy: "Audience Member (VP of Operations)",
    matchedSlide: "Slide 04: Customer Success & Retention Tactics",
    confidence: "99.4% Match",
    answerBullets: [
      "Targeted proactive outreach for accounts with usage drop > 20%.",
      "Streamlined onboarding reduced time-to-first-value from 14 to 4 days.",
      "Automated health-score alerts routed directly to Dedicated CSMs."
    ]
  },
  {
    id: "security",
    question: "Can this operate in high-compliance environments with local or air-gapped data?",
    askedBy: "Audience Member (Chief Information Security Officer)",
    matchedSlide: "Slide 09: Enterprise Architecture & Zero-Trust Governance",
    confidence: "98.8% Match",
    answerBullets: [
      "Zero audio retention: audio streams are processed in-memory and immediately purged.",
      "SOC-2 Type II certified and HIPAA-compliant data pipelines.",
      "Optional on-premise local LLM container for complete air-gapped deployments."
    ]
  },
  {
    id: "timeline",
    question: "What is the engineering roadmap timeline for the multi-speaker voice separation feature?",
    askedBy: "Audience Member (Product Director)",
    matchedSlide: "Slide 12: Technical Milestones & Q4 Deliverables",
    confidence: "97.6% Match",
    answerBullets: [
      "Internal alpha benchmark is currently live with 94% speaker diarization.",
      "Public beta rollout scheduled for Q4 with multi-mic beamforming support.",
      "Full GA integration across PowerPoint and Zoom plugins by December."
    ]
  }
];

const FAQS = [
  {
    q: "Will my audience see the PresentMate overlay while I share my screen?",
    a: "Never. PresentMate runs in a private overlay layer or companion second-screen window that screen-sharing platforms (Zoom, Google Meet, Teams) automatically ignore when sharing an application window."
  },
  {
    q: "Which presentation software and file formats are supported?",
    a: "PresentMate supports PowerPoint (.pptx), PDF slide exports, Google Slides via our lightweight Chrome Extension, and Apple Keynote files."
  },
  {
    q: "How does PresentMate recognize audience questions during live presentations?",
    a: "Our background audio listener uses ultra-low latency acoustic models to distinguish speech directed at the speaker, transcribing questions in real-time and cross-referencing your slide corpus in under 450 milliseconds."
  },
  {
    q: "Is my presentation data kept private and confidential?",
    a: "Yes. Your slides and spoken audio are never used to train foundational AI models. Enterprise accounts also support end-to-end encryption and local processing options."
  },
  {
    q: "Can I use PresentMate offline if conference Wi-Fi is unreliable?",
    a: "Yes! Pre-processed presentations cache all slide notes, predictive Q&A indexes, and vector embeddings locally so you retain instant reference cards even with zero connectivity."
  }
];

// Enhanced landing page with optimized UI components
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<QuestionScenario>(DEMO_SCENARIOS[0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-cream-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 relative">
      <ScrollProgress />

      {/* Ambient background glowing orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[12%] -left-[10%] w-[550px] h-[550px] bg-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-glow" />
        <div 
          className="absolute top-[35%] -right-[10%] w-[500px] h-[500px] bg-emerald-200/35 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "1.2s" }} 
        />
        <div 
          className="absolute -bottom-[10%] left-[20%] w-[600px] h-[600px] bg-teal-100/40 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "2s" }} 
        />
      </div>

      {/* Sticky Dynamic Header */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between ${
          scrolled 
            ? "bg-white/85 backdrop-blur-md border-b border-teal-100/80 shadow-sm" 
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="flex items-center gap-2.5 font-extrabold text-xl text-teal-800 tracking-tight">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-600 p-2 rounded-xl text-white shadow-sm shadow-teal-600/30">
            <Presentation className="w-5 h-5" />
          </div>
          <span className="bg-gradient-to-r from-teal-900 to-teal-700 bg-clip-text text-transparent">
            PresentMate
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#simulator" className="hover:text-teal-600 transition-colors">Interactive Demo</a>
          <a href="#how-it-works" className="hover:text-teal-600 transition-colors">How It Works</a>
          <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
          <a href="#faq" className="hover:text-teal-600 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-teal-800 hover:text-teal-900 hover:bg-teal-50 font-medium">
              Log in
            </Button>
          </Link>
          <Link href="/login?tab=register">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-teal-600/20 hover:-translate-y-0.5 transition-all font-semibold rounded-xl">
              Get Started Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 z-10">
        <section className="px-4 pt-16 pb-24 max-w-6xl mx-auto text-center relative">
          <ScrollReveal animation="fade-up" duration={600}>
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100/70 border border-teal-200/80 text-teal-800 text-xs sm:text-sm font-semibold mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-teal-600 animate-spin" style={{ animationDuration: "8s" }} />
              <span>PresentMate 2.0 • Real-time AI Presentation Co-Pilot</span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-teal-400" />
              <span className="hidden sm:inline-block text-teal-600 font-bold">Sub-450ms Live Q&A</span>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100} duration={700}>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-5xl mx-auto">
              Your Real-Time AI <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500">
                Presentation Assistant
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200} duration={700}>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Upload your slides, get instantaneous speaking prompts, and effortlessly answer spontaneous audience questions with context-aware AI hint cards—live while you speak.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={300} duration={700}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link href="/login?tab=register">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 bg-teal-600 hover:bg-teal-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-600/25 transition-all duration-300 font-semibold rounded-xl gap-2">
                  <span>Start Presenting for Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#simulator">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-6 py-6 border-teal-200 text-teal-800 hover:bg-teal-50 hover:border-teal-300 rounded-xl font-semibold gap-2">
                  <Play className="w-4 h-4 text-teal-600 fill-teal-600" />
                  <span>Try Live HUD Simulator</span>
                </Button>
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">
              No credit card required • Works with PowerPoint, Google Slides & Keynote
            </p>
          </ScrollReveal>

          {/* Interactive Live Presenter HUD Simulator */}
          <section id="simulator" className="mt-16 scroll-mt-24">
            <ScrollReveal animation="zoom-in" delay={350} duration={800}>
              <div className="relative mx-auto max-w-5xl rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-teal-200/50 via-teal-100/30 to-white/70 shadow-2xl shadow-teal-900/10 border border-teal-100/90 backdrop-blur-xl">
                
                {/* Window header */}
                <div className="bg-slate-900 text-slate-300 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-slate-400 font-mono ml-2 hidden sm:inline text-[11px]">
                        PresentMate Live HUD • Active Session #8492
                      </span>
                    </div>

                    {/* Microphone status badge */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/90 border border-teal-500/40 text-teal-300 text-xs font-mono">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span>Microphone Listening</span>
                      
                      {/* Equalizer animation bars */}
                      <div className="flex items-end gap-0.5 h-3 ml-1">
                        <span className="w-1 bg-emerald-400 rounded-sm animate-eq-1" />
                        <span className="w-1 bg-emerald-400 rounded-sm animate-eq-2" />
                        <span className="w-1 bg-emerald-400 rounded-sm animate-eq-3" />
                        <span className="w-1 bg-emerald-400 rounded-sm animate-eq-4" />
                      </div>
                    </div>
                  </div>

                  {/* Simulator Main Content Grid */}
                  <div className="grid lg:grid-cols-12 p-4 sm:p-6 gap-6 text-left">
                    
                    {/* Presenter Slide View (Left 7 columns) */}
                    <div className="lg:col-span-7 bg-slate-900/90 rounded-xl p-5 sm:p-6 border border-slate-800 flex flex-col justify-between min-h-[340px]">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800">
                          <span className="font-semibold text-teal-400 uppercase tracking-wider text-[11px]">
                            Projector Output • Audience View
                          </span>
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                            Slide 4 of 18
                          </span>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                          Q3 Growth & Customer Retention Strategy
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                          Key drivers and operational adjustments leading to accelerated net revenue retention.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-400 mb-1">Net Churn</div>
                            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1">
                              <span>-18.4%</span>
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-[10px] text-slate-500">vs Previous Quarter</div>
                          </div>
                          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-400 mb-1">Expansion ARR</div>
                            <div className="text-xl font-bold text-teal-400">+132%</div>
                            <div className="text-[10px] text-slate-500">Tier-1 Accounts</div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Trigger Buttons */}
                      <div className="pt-4 border-t border-slate-800/80">
                        <div className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                          <span>Simulate an Audience Question:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {DEMO_SCENARIOS.map((scenario) => (
                            <button
                              key={scenario.id}
                              onClick={() => setSelectedScenario(scenario)}
                              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium border text-left ${
                                selectedScenario.id === scenario.id
                                  ? "bg-teal-600 text-white border-teal-500 shadow-sm"
                                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              {scenario.id === "churn" && "💬 Churn Reduction"}
                              {scenario.id === "security" && "🔒 Security & Compliance"}
                              {scenario.id === "timeline" && "🚀 Engineering Roadmap"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Presenter AI Overlay HUD (Right 5 columns) */}
                    <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-950 rounded-xl p-5 border border-teal-500/30 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                      <div>
                        {/* HUD Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-teal-900/60 mb-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Presenter HUD</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/50 text-teal-300 border border-teal-700/40">
                            {selectedScenario.confidence}
                          </span>
                        </div>

                        {/* Detected Question Banner */}
                        <div className="mb-4 bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 mb-1">
                            <Volume2 className="w-3 h-3" />
                            <span>Question Detected from Floor:</span>
                          </div>
                          <p className="text-xs text-slate-200 italic font-serif">
                            &quot;{selectedScenario.question}&quot;
                          </p>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Source: {selectedScenario.askedBy}
                          </div>
                        </div>

                        {/* Live Context Cue Card */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Instant Answer Cues:</span>
                          </div>

                          <div className="space-y-2">
                            {selectedScenario.answerBullets.map((bullet, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-start gap-2 text-xs text-slate-300 bg-teal-950/30 p-2 rounded-lg border border-teal-900/40"
                              >
                                <span className="text-teal-400 font-bold">•</span>
                                <span className="leading-snug">{bullet}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Matched Slide Citation */}
                      <div className="mt-4 pt-3 border-t border-teal-900/50 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate pr-2 text-slate-400 font-mono">
                          {selectedScenario.matchedSlide}
                        </span>
                        <span className="text-teal-400 whitespace-nowrap font-semibold">
                          &lt; 380ms
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </ScrollReveal>
          </section>
        </section>

        {/* Live Metrics Strip */}
        <section className="border-y border-teal-100 bg-white/70 backdrop-blur-sm py-12 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <ScrollReveal animation="fade-up" delay={0}>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 tracking-tight">
                  &lt; 450ms
                </div>
                <div className="text-sm font-semibold text-slate-800 mt-1">Real-Time Latency</div>
                <p className="text-xs text-slate-500 mt-0.5">Instant slide retrieval while speaking</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={100}>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 tracking-tight">
                  99.4%
                </div>
                <div className="text-sm font-semibold text-slate-800 mt-1">Context Relevance</div>
                <p className="text-xs text-slate-500 mt-0.5">Precise matching to your presentation</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={200}>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 tracking-tight">
                  50,000+
                </div>
                <div className="text-sm font-semibold text-slate-800 mt-1">Slides Analyzed</div>
                <p className="text-xs text-slate-500 mt-0.5">From keynote talks to enterprise pitches</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={300}>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 tracking-tight">
                  4.9 / 5.0
                </div>
                <div className="text-sm font-semibold text-slate-800 mt-1">Confidence Score</div>
                <p className="text-xs text-slate-500 mt-0.5">Reported by professional presenters</p>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* How It Works - Step-by-Step Interactive Journey */}
        <section id="how-it-works" className="py-24 px-4 max-w-6xl mx-auto scroll-mt-16">
          <ScrollReveal animation="fade-up" className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-teal-700 font-extrabold text-sm uppercase tracking-wider mb-2">
              Flawless Presentation Flow
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Three Simple Steps to Command Any Room
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-4">
              PresentMate sits silently alongside your presentation tools, turning stage anxiety into effortless executive presence.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <ScrollReveal animation="fade-up" delay={0}>
              <div className="h-full bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-lg mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    01
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Upload & Deep Parse</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Upload your slide deck in PPTX or PDF format. Our engine extracts hidden presenter notes, diagrams, and figures, and automatically anticipates tough questions your audience will likely ask.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-teal-700">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Sub-30-second slide ingestion</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Step 2 */}
            <ScrollReveal animation="fade-up" delay={150}>
              <div className="h-full bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-lg mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    02
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Launch Ghost Presenter HUD</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Activate the unobtrusive overlay. It floats smoothly over your presentation slides or secondary monitor. During video calls or projector shares, your audience only sees your slides—never your HUD.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-teal-700">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>100% Invisible to screen sharing</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Step 3 */}
            <ScrollReveal animation="fade-up" delay={300}>
              <div className="h-full bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-lg mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    03
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Live Q&A Acoustic Intelligence</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    When someone from the audience interrupts or asks a challenging question, PresentMate identifies the query, cites the exact slide or appendix data, and suggests key points in real-time.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-teal-700">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Instant slide number and fact-check</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <section id="features" className="py-24 px-4 bg-gradient-to-b from-white/90 via-teal-50/40 to-white/90 border-y border-teal-100/60 scroll-mt-16">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal animation="fade-up" className="text-center max-w-3xl mx-auto mb-16">
              <div className="text-teal-700 font-extrabold text-sm uppercase tracking-wider mb-2">
                Engineered for High-Stakes Presentations
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Everything You Need to Speak With Absolute Authority
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mt-4">
                Cutting-edge AI features fine-tuned specifically for live speaking, executive meetings, and conference stages.
              </p>
            </ScrollReveal>

            {/* Bento Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Bento 1: Large Featured Card */}
              <ScrollReveal animation="fade-up" className="md:col-span-2">
                <div className="h-full bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold mb-4">
                      <Zap className="w-3.5 h-3.5 text-teal-600" />
                      <span>Continuous Acoustic Radar</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      Sub-Second Live Audio Q&A Recognition
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
                      PresentMate separates room echo and speaker audio to isolate queries from remote callers or in-room audience members. Within 400 milliseconds, it extracts question intent and maps it directly against your presentation archive.
                    </p>
                  </div>

                  {/* Equalizer Wave Mockup */}
                  <div className="mt-8 bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono text-teal-400">
                    <div className="flex items-center gap-3">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300">Acoustic Audio Stream: 48kHz Stereo</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-teal-500 rounded-full animate-eq-1" />
                      <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-eq-2" />
                      <span className="w-1.5 h-4 bg-teal-400 rounded-full animate-eq-3" />
                      <span className="w-1.5 h-7 bg-emerald-300 rounded-full animate-eq-4" />
                      <span className="w-1.5 h-3 bg-teal-500 rounded-full animate-eq-1" />
                      <span className="text-emerald-400 font-bold ml-2">Active</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Bento 2: Slide Teleprompter */}
              <ScrollReveal animation="fade-up" delay={150}>
                <div className="h-full bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-6">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Automated Talking Points</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Transform dense text and complex charts into crisp, easy-to-read bulleted cue cards that keep you on message without reading word-for-word.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-teal-700 font-semibold">
                    Never lose your train of thought
                  </div>
                </div>
              </ScrollReveal>

              {/* Bento 3: Appendix Cross-Referencing */}
              <ScrollReveal animation="fade-up">
                <div className="h-full bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-6">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Appendix Search</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Have 40 backup slides you never expect to open? When an audience member asks about a buried appendix metric, PresentMate instantly identifies the exact slide number to navigate to.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-teal-700 font-semibold">
                    Instant slide citation
                  </div>
                </div>
              </ScrollReveal>

              {/* Bento 4: Pacing & Filler Word Guard */}
              <ScrollReveal animation="fade-up" delay={150}>
                <div className="h-full bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-6">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Pacing & Cadence Coach</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Subtle visual reminders track your words-per-minute and flag excessive filler words in real-time, helping you maintain a steady, commanding presence throughout the presentation.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-teal-700 font-semibold">
                    Optimal 130–150 WPM guidance
                  </div>
                </div>
              </ScrollReveal>

              {/* Bento 5: Enterprise Zero-Trust Privacy */}
              <ScrollReveal animation="fade-up" delay={300}>
                <div className="h-full bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-6">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Enterprise Zero-Trust Security</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Ephemeral in-memory transcription means confidential sales data, financials, and company roadmaps never train AI models or get saved to public logs.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-teal-700 font-semibold">
                    SOC-2 compliant architecture
                  </div>
                </div>
              </ScrollReveal>

            </div>
          </div>
        </section>

        {/* Testimonials / Social Proof */}
        <section className="py-24 px-4 max-w-6xl mx-auto">
          <ScrollReveal animation="fade-up" className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-teal-700 font-extrabold text-sm uppercase tracking-wider mb-2">
              Speaker Testimonials
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Trusted by Founders, Executives & Keynote Speakers
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            <ScrollReveal animation="fade-up" delay={0}>
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm flex flex-col justify-between h-full">
                <p className="text-slate-700 italic text-sm leading-relaxed mb-6 font-serif">
                  &quot;During our Series A pitch, a partner grilled me on our cohort gross retention numbers from three quarters ago. PresentMate surfaced the exact backup slide cue in literally half a second. We closed the round.&quot;
                </p>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Elena Rostova</div>
                  <div className="text-xs text-teal-700 font-medium">Founder & CEO, Synthetix AI</div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={150}>
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm flex flex-col justify-between h-full">
                <p className="text-slate-700 italic text-sm leading-relaxed mb-6 font-serif">
                  &quot;The confidence boost is unmatched. I no longer sweat Q&A sessions because I know PresentMate is right in my peripheral vision, holding all the answers to our 80-page product manual.&quot;
                </p>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Marcus Vance</div>
                  <div className="text-xs text-teal-700 font-medium">VP of Solutions Engineering, CloudScale</div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={300}>
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-teal-100 shadow-sm flex flex-col justify-between h-full">
                <p className="text-slate-700 italic text-sm leading-relaxed mb-6 font-serif">
                  &quot;The pacing coach alone transformed my conference talks. It subtly nudged me when I was speeding through technical slides, and the Q&A overlay worked flawlessly over Zoom.&quot;
                </p>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Dr. Sarah Jenkins</div>
                  <div className="text-xs text-teal-700 font-medium">Keynote Speaker & AI Researcher</div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Interactive FAQ Accordion */}
        <section id="faq" className="py-24 px-4 bg-white/70 border-t border-teal-100 scroll-mt-16">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal animation="fade-up" className="text-center mb-16">
              <div className="text-teal-700 font-extrabold text-sm uppercase tracking-wider mb-2">
                Got Questions?
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
            </ScrollReveal>

            <div className="space-y-4">
              {FAQS.map((faq, index) => (
                <ScrollReveal key={index} animation="fade-up" delay={index * 60}>
                  <div className="rounded-2xl border border-teal-100 bg-white/90 overflow-hidden transition-all duration-200">
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between font-bold text-slate-900 hover:text-teal-700 transition-colors"
                    >
                      <span className="text-base sm:text-lg">{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-teal-600 transition-transform duration-300 ${
                          openFaq === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openFaq === index && (
                      <div className="px-6 pb-6 pt-1 text-sm text-slate-600 leading-relaxed border-t border-teal-50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* High-Impact Call to Action Banner */}
        <section className="py-20 px-4 max-w-5xl mx-auto">
          <ScrollReveal animation="zoom-in">
            <div className="relative rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white p-8 sm:p-14 text-center overflow-hidden shadow-2xl shadow-teal-900/30">
              
              {/* Background decorative glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight relative z-10">
                Never Fear Another Tough Presentation Question
              </h2>
              <p className="mt-4 text-base sm:text-lg text-teal-100/90 max-w-xl mx-auto relative z-10 font-medium">
                Join thousands of confident speakers delivering pitch decks, technical reviews, and conference talks with PresentMate.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <Link href="/login?tab=register">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 bg-white hover:bg-teal-50 text-teal-900 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    Create Free Account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6 border-teal-300/40 text-white hover:bg-teal-700/50 rounded-xl font-semibold">
                    Sign In
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-teal-200/80 font-medium relative z-10">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Free Forever Tier</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Instant Setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Zero Credit Card</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* Modern Sleek Footer */}
      <footer className="border-t border-teal-100/80 bg-white/90 backdrop-blur-sm py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 font-extrabold text-lg text-teal-800">
            <div className="bg-teal-600 p-1.5 rounded-lg text-white">
              <Presentation className="w-4 h-4" />
            </div>
            <span>PresentMate</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
            <a href="#simulator" className="hover:text-teal-600 transition-colors">Simulator</a>
            <a href="#how-it-works" className="hover:text-teal-600 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
            <a href="#faq" className="hover:text-teal-600 transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-teal-600 transition-colors">Login</Link>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
            <span>© {new Date().getFullYear()} PresentMate Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
