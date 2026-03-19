"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
import { authApi } from "@/lib/api";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/strategies",
    label: "Strategies",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/backtests",
    label: "Backtests",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: "/positions",
    label: "Positions",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    href: "/autotrade",
    label: "Auto Trade",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 2.25l-9 10.5h6l-1.5 9 9-10.5h-6l1.5-9z" />
      </svg>
    ),
  },
  {
    href: "/live",
    label: "Live",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75a6 6 0 018.485 0m-11.314-2.829a10 10 0 0114.142 0M6 12a2.25 2.25 0 013.182 0l2.318 2.318L13.818 12A2.25 2.25 0 0117 15.182l-3.182 3.182a2.25 2.25 0 01-3.182 0L7.454 15.18A2.25 2.25 0 016 12z" />
      </svg>
    ),
  },
];

const adminNavItems = [
  {
    href: "/admin",
    label: "Admin Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a2.25 2.25 0 01-2.25-2.25V7.5A2.25 2.25 0 017.5 5.25h9A2.25 2.25 0 0118.75 7.5v9a2.25 2.25 0 01-2.25 2.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6m-6 3h6m-6 3h3" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "User Management",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.964 0a9 9 0 10-11.964 0m11.964 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/trades",
    label: "Trade Monitor",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17.25l6-6 4.5 4.5L21 8.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 8.25H21v6.75" />
      </svg>
    ),
  },
  {
    href: "/admin/risk",
    label: "Risk Settings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 5.056-4.611 9.157-10.5 9.157S0 17.056 0 12 4.611 2.843 10.5 2.843 21 6.944 21 12z" />
      </svg>
    ),
  },
  {
    href: "/admin/logs",
    label: "System Logs",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4.5h6M7.5 3.75h9A2.25 2.25 0 0118.75 6v12A2.25 2.25 0 0116.5 20.25h-9A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    authApi
      .me()
      .then((res) => {
        if (mounted) {
          setIsAdmin(res.data.role === "admin");
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAdmin(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 border-r border-white/10 bg-[#071835] text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-6 py-6">
        <BrandLogo theme="dark" iconSize="sm" tagline="Research | Backtest | Execute" />
      </div>

      <div className="px-6 py-5">
        <div className="rounded-sm border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Operate</p>
          <p className="mt-3 text-sm leading-7 text-sky-50/75">
            Navigate research, testing, paper execution, and live monitoring from one controlled workspace.
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-100/45">
            Navigation
          </p>
          <ul className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-sm border px-3 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#4cb4f0]/30 bg-[#007cc3]/15 text-white"
                      : "border-transparent text-sky-50/72 hover:border-white/10 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <span className={isActive ? "text-sky-200" : "text-sky-100/50 group-hover:text-sky-100"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-cyan-300" /> : null}
                </Link>
              </li>
            );
            })}
          </ul>
          {isAdmin ? (
            <>
              <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/55">
                Admin
              </p>
              <ul className="mt-4 space-y-1.5">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-sm border px-3 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "border-cyan-300/30 bg-cyan-400/10 text-white"
                            : "border-transparent text-sky-50/72 hover:border-white/10 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <span className={isActive ? "text-cyan-200" : "text-sky-100/50 group-hover:text-sky-100"}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-cyan-300" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-sm border border-transparent px-3 py-3 text-sm font-semibold text-sky-50/72 transition hover:border-red-300/10 hover:bg-red-500/10 hover:text-red-200"
        >
          <svg className="h-5 w-5 text-sky-100/55" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
