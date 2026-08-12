import { useState } from "react";
import { Activity } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { GridPattern } from "../components/velora/grid-pattern";
import { AuroraBackground } from "../components/AuroraBackground";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call for login
    setTimeout(() => {
      setIsLoading(false);
      navigate("/app");
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Left Panel: Auth Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:flex-none lg:w-[500px] xl:w-[600px] bg-[var(--color-background)] z-10">
        <div className="mx-auto w-full max-w-sm">
          
          <Link to="/" className="flex items-center gap-2 font-semibold mb-12">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
              <Activity size={18} color="white" />
            </div>
            <span className="text-xl text-white">Nova</span>
          </Link>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Welcome back</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Log in to continue to your engineering dashboard.</p>
          </div>

          <div className="mt-8">
            <button className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-full font-medium text-sm hover:bg-slate-100 transition-colors">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              <div className="h-px bg-[var(--color-border)] flex-1"></div>
              or continue with email
              <div className="h-px bg-[var(--color-border)] flex-1"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                  placeholder="ada@company.com"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
                  <a href="#" className="text-xs text-[var(--color-accent)] hover:text-blue-400 hover:underline underline-offset-4 transition-all">
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-[var(--color-accent)] hover:bg-blue-600 text-white py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-70 mt-6"
              >
                {isLoading ? "Authenticating..." : "Log in"}
              </button>
            </form>
            
            <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
              No account yet?{" "}
              <a href="#" className="font-medium text-[var(--color-accent)] hover:underline underline-offset-4 transition-all">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Velora Auth Visual */}
      <div className="relative hidden lg:block flex-1 overflow-hidden border-l border-[var(--color-border)]">
        <AuroraBackground />
        <GridPattern
          width={48}
          height={48}
          className="fill-transparent stroke-[var(--color-border)]/40"
        />
        <div className="relative flex h-full flex-col justify-end p-12 z-10">
          <figure className="max-w-md rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/70 p-6 backdrop-blur">
            <blockquote className="text-sm leading-6 text-white font-medium">
              “Nova's semantic clustering replaced three of our legacy triage tools in one evening. The automated sentiment analysis and tagging works out of the box.”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--color-surface)] bg-blue-500 flex items-center justify-center text-xs font-bold text-white">MC</div>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Maya Chen</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Lead Engineer, Studio K</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
