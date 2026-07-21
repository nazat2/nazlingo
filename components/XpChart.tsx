"use client";

import { XpDay } from "@/lib/types";

export default function XpChart({ history }: { history: XpDay[] }) {
  const days = last7Days();
  const map = new Map(history.map((h) => [h.date, h.xp]));
  const values = days.map((d) => map.get(d.date) || 0);
  const max = Math.max(...values, 20);

  return (
    <div>
      <div className="flex h-28 items-end justify-between gap-2">
        {days.map((d, i) => {
          const value = values[i];
          const heightPct = Math.max((value / max) * 100, value > 0 ? 6 : 2);
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[22px] rounded-t-md transition-all ${
                    value > 0 ? "bg-indigo" : "bg-ink/10"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`${value} XP`}
                />
              </div>
              <span className="text-[10px] font-semibold text-ink/40">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function last7Days(): { date: string; label: string }[] {
  const labels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const result: { date: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    result.push({
      date: d.toISOString().slice(0, 10),
      label: labels[d.getDay()],
    });
  }
  return result;
}
