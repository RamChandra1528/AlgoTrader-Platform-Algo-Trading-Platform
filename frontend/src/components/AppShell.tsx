"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

interface AppShellProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AppShell({
  title,
  subtitle,
  eyebrow = "Workspace",
  actions,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell flex">
      <Sidebar />

      <div className="app-main min-w-0 flex-1">
        <header className="app-header">
          <div className="app-header-inner">
            <div>
              <p className="app-kicker">{eyebrow}</p>
              <h1 className="app-title">{title}</h1>
              <p className="app-subtitle">{subtitle}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
