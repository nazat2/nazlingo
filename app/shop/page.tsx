"use client";

import { useProgress } from "@/lib/ProgressContext";
import { buyStreakFreeze, STREAK_FREEZE_COST } from "@/lib/progress";
import { Gem, Snowflake } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export default function ShopPage() {
  const { progress, setProgress } = useProgress();
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function handleBuyFreeze() {
    if (progress.gems < STREAK_FREEZE_COST) {
      flash("Permata tidak cukup");
      return;
    }
    setProgress((p) => buyStreakFreeze(p));
    flash("Pembeku streak dibeli!");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:pb-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Toko</h1>
        <div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 shadow-card">
          <Gem size={18} className="text-indigo" />
          <span className="font-mono text-sm font-bold">{progress.gems}</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink/50">
        Tukar permata yang kamu kumpulkan dari pelajaran dan pencapaian.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ShopItem
          icon={<Snowflake className="text-indigo" size={28} />}
          title="Pembeku Streak"
          description="Lindungi hari beruntunmu kalau kelewatan belajar sehari."
          cost={STREAK_FREEZE_COST}
          owned={progress.streakFreezes}
          ownedLabel="dimiliki"
          disabled={progress.gems < STREAK_FREEZE_COST}
          onBuy={handleBuyFreeze}
        />
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
          <div className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface shadow-node">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function ShopItem({
  icon,
  title,
  description,
  cost,
  owned,
  ownedLabel,
  disabled,
  onBuy,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cost: number;
  owned: number | null;
  ownedLabel?: string;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-5 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink/[0.04]">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-base font-bold">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-ink/50">{description}</p>
      {owned !== null && (
        <p className="mt-2 text-xs font-semibold text-ink/40">
          {owned} {ownedLabel}
        </p>
      )}
      <button
        onClick={onBuy}
        disabled={disabled}
        className={cn(
          "mt-4 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white shadow-node transition-all active:translate-y-0.5 active:shadow-nodePressed",
          disabled ? "cursor-not-allowed bg-ink/15 text-ink/30 shadow-none" : "bg-indigo"
        )}
      >
        <Gem size={15} />
        {cost}
      </button>
    </div>
  );
}
