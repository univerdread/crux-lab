import { Suspense, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { currentTopic } from "../lib/topics";
import { DrawerProvider } from "./drawer";

const NAV: { to: string; label: string }[] = [
  { to: "/topics", label: "Topics" },
  { to: "/briefs", label: "Research directions" },
  { to: "/lab", label: "Lab" },
  { to: "/atlas", label: "Atlas" },
  { to: "/results", label: "Results" },
  { to: "/about", label: "About" },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <DrawerProvider>
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:outline"
      >
        Skip to content
      </a>
      <header className="no-print border-b border-ink">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <NavLink to="/" className="font-serif text-[1.45rem] font-semibold tracking-tight" end>
            Crux Lab
            <span className="ml-2 hidden font-mono text-[0.68rem] font-normal tracking-normal text-ink-soft sm:inline">
              a research lab for philosophy
            </span>
          </NavLink>
          {currentTopic() ? (
            <NavLink to="/topics" className="font-mono text-[0.72rem] text-ink-soft underline decoration-rule underline-offset-4 hover:decoration-ink" title="Change topic">
              topic: {currentTopic()!.name}
            </NavLink>
          ) : null}
          </div>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    className={({ isActive }) =>
                      `smallcaps text-[1.02rem] underline-offset-[6px] hover:underline ${isActive ? "text-ink underline decoration-ink decoration-[1.5px]" : "text-ink-soft"}`
                    }
                  >
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="min-h-[70vh]">
        <Suspense
          fallback={
            <p className="mx-auto max-w-[1400px] px-6 py-10 font-mono text-sm text-ink-soft" aria-live="polite">
              Opening the notebook…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <footer className="no-print mt-20 border-t border-rule">
        <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-4 px-4 py-6 text-[0.9rem] text-ink-soft sm:px-6">
          <p>Every number on this site is read from files the lab generated.</p>
          <p className="italic">The Referee labels dialectical status, never the truth of a conclusion.</p>
        </div>
      </footer>
    </DrawerProvider>
  );
}
