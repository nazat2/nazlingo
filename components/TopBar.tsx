"use client";

import { Flame, Gem } from "lucide-react";
import { useProgress } from "@/lib/ProgressContext";
import { getLevel } from "@/lib/levels";
import Link from "next/link";
import Image from "next/image";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/cn";

export default function TopBar() {
  const { progress } = useProgress();
  const level = getLevel(progress.xp);

  return (
    <header className="glass sticky top-0 z-40 w-full border-b border-ink/5">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logomark />
          <span className="hidden font-display text-lg font-bold tracking-tight text-indigo-deep sm:inline">
            Nazlingo
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            href="/profile"
            className="hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 shadow-soft ring-1 ring-ink/5 transition-transform hover:-translate-y-0.5 md:flex"
            title={`Level ${level.rank}: ${level.title}`}
          >
            <span className="text-base leading-none">{level.icon}</span>
            <span className="font-mono text-sm font-bold text-ink">{level.title}</span>
          </Link>
          <StatPill icon={<Flame size={17} className="fill-torii text-torii" />} value={progress.streak} label="hari beruntun" tint="torii" />
          <StatPill icon={<Gem size={17} className="fill-indigo-light text-indigo" />} value={progress.gems} label="permata" tint="indigo" />
        </div>
      </div>
    </header>
  );
}

function Logomark() {
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl shadow-stamp ring-1 ring-ink/5">
      <Image
        src="/icons/icon-192.png"
        alt="Nazlingo"
        fill
        sizes="36px"
        className="object-cover"
        priority
      />
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tint: "torii" | "indigo";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1.5 sm:px-3",
        tint === "torii" ? "bg-torii/10" : "bg-indigo/10"
      )}
      title={label}
      aria-label={`${label}: ${value}`}
    >
      {icon}
      <span className="font-mono text-sm font-bold text-ink">{value}</span>
    </div>
  );
}
