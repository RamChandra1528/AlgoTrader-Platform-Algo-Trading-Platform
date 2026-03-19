"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoader from "@/components/PageLoader";
import { authApi } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { User } from "@/types";

interface AdminGuardProps {
  children: (adminUser: User) => ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await authApi.me();
        if (!mounted) {
          return;
        }
        if (res.data.role !== "admin") {
          router.push("/dashboard");
          return;
        }
        setAdminUser(res.data);
      } catch (err: any) {
        if (!mounted) {
          return;
        }
        setError(err.response?.data?.detail || "Failed to validate admin access");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return <PageLoader label="Loading admin workspace" />;
  }

  if (error || !adminUser) {
    return (
      <div className="auth-shell flex items-center justify-center px-4">
        <div className="surface-card max-w-lg p-8 text-center">
          <p className="app-kicker">Admin Access</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#0b1f3a]">
            Access could not be verified
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{error || "Admin user was not found."}</p>
        </div>
      </div>
    );
  }

  return <>{children(adminUser)}</>;
}
