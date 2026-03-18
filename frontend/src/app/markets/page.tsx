"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import MarketPrices from "@/components/MarketPrices";
import { isAuthenticated } from "@/lib/auth";

export default function MarketsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  return (
    <AppShell
      eyebrow="Market watch"
      title="Market Prices"
      subtitle="Review the full tracked watchlist with live price movement across all companies currently streamed by the platform."
    >
      <MarketPrices mode="full" />
    </AppShell>
  );
}
