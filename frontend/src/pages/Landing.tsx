import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { AuroraBackground } from "../components/AuroraBackground";

export function Landing() {
  const easeSmooth: [number, number, number, number] = [0.4, 0, 0.2, 1];

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <AuroraBackground />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: easeSmooth }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <Activity size={18} color="white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white uppercase">Nova</span>
            </motion.div>
          </div>
        </div>

        {/* Links & CTA */}
        <div className="flex items-center gap-8">
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25, ease: easeSmooth }}
            >
              <Link 
                to="/login"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all block backdrop-blur-sm"
              >
                Sign In ›
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-7xl mx-auto w-full px-8 pb-20">
        
        {/* Left Column: Text */}
        <div className="lg:col-span-5 flex flex-col justify-center relative z-20 pt-12 lg:pt-0">
          <motion.h1 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.2, ease: easeSmooth }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white mb-6 leading-[1.1]"
          >
            Triage Your Engineering Tickets Quickly & Effectively
          </motion.h1>
          
          <motion.p 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.0, delay: 2.2, ease: easeSmooth }}
            className="text-base md:text-lg text-[var(--color-text-secondary)] leading-relaxed"
          >
            Engineering teams of all sizes use Nova to automatically categorize, route, and resolve issues across GitHub, Zendesk, and Jira using powerful semantic clustering.
          </motion.p>
        </div>

        {/* Right Column: Mockup */}
        <div className="lg:col-span-7 relative flex justify-end">
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.2, ease: easeSmooth }}
            className="w-full max-w-[800px] rounded-2xl overflow-hidden border border-[var(--color-border)]/50 shadow-2xl shadow-black/50 relative lg:translate-x-12 xl:translate-x-20"
          >
            <img src="/mockup.jpg" alt="Dashboard Mockup" className="w-full h-auto object-cover" />
            
            {/* Ambient reflection on the glass */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none mix-blend-overlay"></div>
          </motion.div>
        </div>

      </main>

    </div>
  );
}
