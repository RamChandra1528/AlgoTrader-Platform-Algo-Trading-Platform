"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

const solutions = [
  {
    title: "Research and strategy engineering",
    description:
      "Design MA crossover and RSI systems, standardize parameters, and move ideas from concept to repeatable trading logic.",
  },
  {
    title: "Backtesting at portfolio speed",
    description:
      "Validate signals across date ranges, analyze Sharpe and drawdown, and compare outcomes before any live deployment decision.",
  },
  {
    title: "Execution with live oversight",
    description:
      "Run paper trades, monitor positions in real time, and automate decisions with configurable profit targets and stop losses.",
  },
];

const highlights = [
  "Unified workspace for quant research, backtests, paper trading, and live monitoring",
  "FastAPI and Next.js architecture built for extensibility, clear APIs, and operational visibility",
  "Per-user portfolios, trading history, and WebSocket-powered updates across the dashboard",
];

const modules = [
  {
    eyebrow: "01",
    title: "Market intelligence",
    copy:
      "Curated watchlists, ranked signals, and live account updates give teams a single operational picture of market opportunity.",
  },
  {
    eyebrow: "02",
    title: "Decision systems",
    copy:
      "Strategy templates, parameterized rules, and historical validation help turn trading logic into governed execution paths.",
  },
  {
    eyebrow: "03",
    title: "Execution control",
    copy:
      "Capital allocation, budget-per-trade controls, and live bot supervision help teams move faster without losing discipline.",
  },
  {
    eyebrow: "04",
    title: "Performance visibility",
    copy:
      "Equity curves, win rate, open positions, and trade logs make it easier to interpret outcomes and improve system behavior.",
  },
];

const proofPoints = [
  { value: "100k+", label: "simulated orders processed across workflows" },
  { value: "63.4%", label: "sample win rate visualized in the trading workspace" },
  { value: "<50 ms", label: "latency target for account state refresh" },
  { value: "4", label: "core workspaces from strategy to execution" },
];

const stories = [
  {
    title: "Build confidence before capital is deployed",
    description:
      "Test a strategy against historical data, inspect drawdowns, and review every trade before moving into auto-trading mode.",
  },
  {
    title: "Operate from one command surface",
    description:
      "Manage authentication, strategy definitions, portfolio state, and live automation from a single enterprise-style interface.",
  },
  {
    title: "Scale from prototype to platform",
    description:
      "The current stack is structured so teams can extend broker integrations, analytics, and risk services without rebuilding the core.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const handlePrimaryCta = () => {
    if (authed) {
      router.push("/dashboard");
      return;
    }

    router.push("/register");
  };

  const handleSecondaryCta = () => {
    if (authed) {
      router.push("/dashboard");
      return;
    }

    router.push("/login");
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-slate-900">
      <div className="border-b border-slate-200 bg-[#0b2a5b] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 text-[11px] uppercase tracking-[0.18em]">
          <p>Navigate the next in algorithmic trading</p>
          <div className="hidden gap-6 text-white/70 md:flex">
            <span>Research</span>
            <span>Automation</span>
            <span>Performance</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#007cc3] text-sm font-bold text-white">
              AT
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-[#0b2a5b]">AlgoTrader</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Enterprise Trading Platform
              </p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
            <button onClick={() => scrollToSection("capabilities")} className="transition hover:text-[#007cc3]">
              Capabilities
            </button>
            <button onClick={() => scrollToSection("platform")} className="transition hover:text-[#007cc3]">
              Platform
            </button>
            <button onClick={() => scrollToSection("insights")} className="transition hover:text-[#007cc3]">
              Insights
            </button>
            <button onClick={() => scrollToSection("contact")} className="transition hover:text-[#007cc3]">
              Get started
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSecondaryCta}
              className="hidden rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#007cc3] hover:text-[#007cc3] sm:inline-flex"
            >
              {authed ? "Dashboard" : "Sign in"}
            </button>
            <button
              onClick={handlePrimaryCta}
              className="rounded-sm bg-[#007cc3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#056ca8]"
            >
              {authed ? "Open workspace" : "Start now"}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-b from-[#0a3d91] via-[#0b2a5b] to-[#081a38] lg:block" />
          <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-sky-100 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
            <div className="relative z-10 max-w-3xl">
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#007cc3]">
                Algorithmic trading for modern teams
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-[#0b1f3a] md:text-6xl">
                Accelerate the journey from market signal to governed execution.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                Build strategies, backtest with historical depth, monitor paper trades, and launch
                automated workflows through a platform designed to feel operational, structured,
                and enterprise-ready.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  onClick={handlePrimaryCta}
                  className="rounded-sm bg-[#007cc3] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#056ca8]"
                >
                  {authed ? "Go to dashboard" : "Create an account"}
                </button>
                <button
                  onClick={() => scrollToSection("platform")}
                  className="rounded-sm border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#007cc3] hover:text-[#007cc3]"
                >
                  Explore the platform
                </button>
              </div>

              <div className="mt-12 grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-3">
                {proofPoints.slice(0, 3).map((item) => (
                  <div key={item.label}>
                    <p className="text-3xl font-semibold tracking-tight text-[#0b2a5b]">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 lg:pl-8">
              <div className="overflow-hidden rounded-sm border border-white/10 bg-[#0b2a5b] text-white shadow-[0_30px_80px_rgba(7,24,53,0.24)]">
                <div className="border-b border-white/10 px-6 py-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200">Trading command view</p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight">
                    A platform view designed for clarity, control, and continuous decision-making.
                  </h2>
                </div>

                <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
                  <div className="rounded-sm bg-white/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-100/80">Portfolio equity</p>
                    <p className="mt-4 text-3xl font-semibold">$100,028.51</p>
                    <p className="mt-2 text-sm text-emerald-300">+0.03% today</p>
                  </div>
                  <div className="rounded-sm bg-white/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-100/80">Open positions</p>
                    <p className="mt-4 text-3xl font-semibold">07</p>
                    <p className="mt-2 text-sm text-sky-100/80">Diversified paper book</p>
                  </div>
                  <div className="rounded-sm bg-white/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-100/80">Signal health</p>
                    <p className="mt-4 text-3xl font-semibold">BUY</p>
                    <p className="mt-2 text-sm text-emerald-300">AAPL and NVDA lead</p>
                  </div>
                  <div className="rounded-sm bg-white/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-100/80">Automation mode</p>
                    <p className="mt-4 text-3xl font-semibold">Active</p>
                    <p className="mt-2 text-sm text-sky-100/80">Risk rules enforced</p>
                  </div>
                </div>

                <div className="border-t border-white/10 px-6 py-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200">Why teams choose it</p>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-sky-50/90">
                    {highlights.map((highlight) => (
                      <div key={highlight} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 flex-none rounded-full bg-cyan-300" />
                        <p>{highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="bg-[#eef4f8] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#007cc3]">
                Capabilities
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b1f3a] md:text-5xl">
                Core building blocks for a disciplined trading operation.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                The platform is organized like a modern digital program: clear operating modules,
                visible outcomes, and connected workflows from insight to action.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((module) => (
                <article
                  key={module.title}
                  className="group rounded-sm border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#98d7f7] hover:shadow-[0_24px_50px_rgba(10,61,145,0.12)]"
                >
                  <p className="text-sm font-semibold text-[#007cc3]">{module.eyebrow}</p>
                  <h3 className="mt-6 text-xl font-semibold leading-8 text-[#0b2a5b]">{module.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{module.copy}</p>
                  <p className="mt-8 text-sm font-semibold text-slate-500 transition group-hover:text-[#007cc3]">
                    Learn more
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="bg-white py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#007cc3]">
                Platform overview
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b1f3a] md:text-5xl">
                Designed like an enterprise front door, built for active trading workflows.
              </h2>
              <p className="mt-6 text-base leading-8 text-slate-600">
                This homepage now follows a more corporate, Infosys-inspired visual system:
                stronger information hierarchy, more breathing room, modular content blocks,
                and a blue-led brand language instead of a dark product-first presentation.
              </p>
              <div className="mt-8 rounded-sm border border-slate-200 bg-[#f6f9fc] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Included in the platform
                </p>
                <div className="mt-5 space-y-4">
                  {solutions.map((solution) => (
                    <div key={solution.title} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold text-[#0b2a5b]">{solution.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{solution.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-sm bg-[#0b2a5b] p-8 text-white">
                <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Workspaces</p>
                <p className="mt-4 text-5xl font-semibold">{proofPoints[3].value}</p>
                <p className="mt-3 text-sm leading-7 text-sky-50/85">{proofPoints[3].label}</p>
              </div>
              <div className="rounded-sm border border-slate-200 bg-[#eef4f8] p-8">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Architecture</p>
                <p className="mt-4 text-2xl font-semibold text-[#0b2a5b]">FastAPI + Next.js</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  API-first backend services and a modern frontend make the product easier to extend,
                  observe, and explain to stakeholders.
                </p>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Execution controls</p>
                <p className="mt-4 text-2xl font-semibold text-[#0b2a5b]">Budget, stop loss, targets</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Structured execution settings make auto-trading safer to evaluate and easier to
                  tune as strategies evolve.
                </p>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Observability</p>
                <p className="mt-4 text-2xl font-semibold text-[#0b2a5b]">History, P&amp;L, live state</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Teams can inspect portfolio behavior from multiple angles instead of relying on a
                  single headline metric.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="insights" className="bg-[#0b2a5b] py-16 text-white md:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">
                Insights
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Outcome-led messaging for a more credible first impression.
              </h2>
              <p className="mt-5 text-base leading-8 text-sky-50/80">
                Instead of leading with a dense product snapshot, the page now explains what the
                platform helps a team do, how the system is organized, and why the workflow matters.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {stories.map((story) => (
                <article key={story.title} className="rounded-sm border border-white/10 bg-white/5 p-6">
                  <h3 className="text-2xl font-semibold leading-9">{story.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-sky-50/80">{story.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-sm border border-slate-200 bg-gradient-to-r from-[#f8fbff] to-[#eef4f8] p-8 md:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#007cc3]">
                    Get started
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b1f3a] md:text-5xl">
                    Bring strategy design, testing, and auto-trading into one operating model.
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                    The landing page has been repositioned to feel more like a credible enterprise
                    technology brand. From here, users can move into registration or directly into
                    the dashboard without losing the institutional tone.
                  </p>
                </div>

                <div className="flex flex-col gap-4 md:flex-row lg:flex-col">
                  <button
                    onClick={handlePrimaryCta}
                    className="rounded-sm bg-[#007cc3] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#056ca8]"
                  >
                    {authed ? "Open dashboard" : "Create free account"}
                  </button>
                  <button
                    onClick={handleSecondaryCta}
                    className="rounded-sm border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#007cc3] hover:text-[#007cc3]"
                  >
                    {authed ? "Review portfolio" : "Sign in"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#071835] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-lg font-semibold">AlgoTrader Platform</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/70">
              A structured trading platform for research, backtesting, paper execution, and automated
              operations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm text-sky-50/70">
            <div>
              <p className="mb-3 font-semibold text-white">Platform</p>
              <div className="space-y-2">
                <button onClick={() => scrollToSection("capabilities")} className="block transition hover:text-white">
                  Capabilities
                </button>
                <button onClick={() => scrollToSection("platform")} className="block transition hover:text-white">
                  Overview
                </button>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Access</p>
              <div className="space-y-2">
                <button onClick={handlePrimaryCta} className="block transition hover:text-white">
                  {authed ? "Dashboard" : "Register"}
                </button>
                <button onClick={handleSecondaryCta} className="block transition hover:text-white">
                  {authed ? "Portfolio" : "Login"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
