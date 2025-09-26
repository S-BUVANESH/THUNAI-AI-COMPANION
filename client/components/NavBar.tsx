import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Community", href: "#community" },
  { label: "About Us", href: "#about" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70",
      scrolled ? "shadow-sm" : "shadow-none",
    )}>
      <nav className="container mx-auto flex h-16 items-center justify-between">
        <a href="#hero" className="text-xl font-extrabold tracking-wide text-foreground">
          <span className="text-primary">THUNAI</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-foreground/80 hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          <Button asChild className="rounded-md">
            <a href="#how">Launch App</a>
          </Button>
        </div>
        <button
          aria-label="Toggle menu"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md border border-transparent hover:border-border"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </nav>
      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="container py-3 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-foreground/80 hover:text-foreground">
                {l.label}
              </a>
            ))}
            <Button asChild className="w-full">
              <a href="#how" onClick={() => setOpen(false)}>Launch App</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
