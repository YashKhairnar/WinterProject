import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="z-10 w-full max-w-md px-6 text-center space-y-10">

        {/* Logo / Header */}
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center border border-gray-100 shadow-xl shadow-black/5">
            <span className="text-3xl">☕</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Cafe Admin
          </h1>
          <p className="text-gray-500 text-lg">
            Manage your coffee shop with ease.
          </p>
        </div>

        {/* Auth Actions */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <Link
            href="/login"
            className="block w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg hover:bg-black transition-colors active:scale-[0.98] shadow-lg shadow-gray-900/10"
          >
            Log In
          </Link>

          <Link
            href="/signup"
            className="block w-full py-4 rounded-xl bg-white border border-gray-200 text-gray-900 font-semibold text-lg hover:bg-gray-50 transition-colors active:scale-[0.98] shadow-sm"
          >
            Sign Up
          </Link>

          <div className="pt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-[1px] bg-border flex-1" />
            <span>or continue with</span>
            <div className="h-[1px] bg-border flex-1" />
          </div>

          <div className="flex gap-4 justify-center">
            {/* Mock Social Buttons */}
            <button className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              G
            </button>
            <button className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              A
            </button>
          </div>
        </div>

      </main>

      <footer className="absolute bottom-6 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Cafe Admin Portal
      </footer>
    </div>
  );
}
