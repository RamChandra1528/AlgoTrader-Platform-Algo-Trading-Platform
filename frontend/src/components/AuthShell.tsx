"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  footerPrompt: string;
  footerHref: string;
  footerLabel: string;
  children: ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  footerPrompt,
  footerHref,
  footerLabel,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-shell flex items-center justify-center">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-200">
              AlgoTrader Platform
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight">
              Enterprise-style trading workflows for strategy, validation, and execution.
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-sky-50/80">
              The product now follows the same blue-led corporate design language as the landing page,
              while keeping the existing authentication and trading flows unchanged.
            </p>

            <div className="mt-10 space-y-4 text-sm text-sky-50/80">
              <div className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
                <p>Strategy creation, backtesting, positions, and live automation remain available.</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
                <p>Forms and navigation keep the same behavior, routes, and API integration.</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
                <p>Paper-trading context is preserved throughout the experience.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form">
          <div className="mb-8">
            <BrandLogo iconSize="md" tagline="Research | Backtest | Execute" />

            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-[#0b1f3a]">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{subtitle}</p>
          </div>

          {children}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              {footerPrompt}{" "}
              <Link href={footerHref} className="font-semibold text-[#007cc3] transition hover:text-[#056ca8]">
                {footerLabel}
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs uppercase tracking-[0.18em] text-slate-400">
            Paper trading only. No real money involved.
          </p>
        </div>
      </div>
    </div>
  );
}
