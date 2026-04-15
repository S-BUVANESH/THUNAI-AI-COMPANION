import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pageLinks = [
  { label: "Home", to: "/" },
  { label: "Diagnostics", to: "/diagnostics" },
  { label: "Crop Switch", to: "/crop-switch" },
];

const sectionLinks = [
  { label: "Community", href: "/#community" },
  { label: "About", href: "/#about" },
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
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        scrolled ? "shadow-sm" : "shadow-none",
      )}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="text-xl font-extrabold tracking-wide text-foreground">
          <span className="text-primary">THUNAI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {pageLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "text-sm transition-colors",
                  isActive
                    ? "font-semibold text-foreground"
                    : "text-foreground/80 hover:text-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Button asChild className="rounded-md">
            <Link to="/diagnostics">Launch App</Link>
          </Button>
        </div>

        <button
          aria-label="Toggle menu"
          className="inline-flex items-center justify-center rounded-md border border-transparent p-2 hover:border-border md:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t bg-white md:hidden">
          <div className="container flex flex-col gap-3 py-3">
            {pageLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "py-2",
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-foreground/80 hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-foreground/80 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button asChild className="w-full">
              <Link to="/diagnostics" onClick={() => setOpen(false)}>
                Launch App
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
