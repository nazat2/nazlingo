"use client";

import { Unit, UserProgress } from "@/lib/types";
import { Check, Lock, Star, Bird } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

const COLOR_MAP: Record<
  Unit["color"],
  { bg: string; gradient: string; ring: string; text: string }
> = {
  indigo: { bg: "bg-indigo", gradient: "bg-grad-indigo", ring: "ring-indigo-light", text: "text-indigo" },
  torii: { bg: "bg-torii", gradient: "bg-grad-torii", ring: "ring-torii-light", text: "text-torii" },
  sakura: { bg: "bg-sakura-deep", gradient: "bg-grad-sakura", ring: "ring-sakura", text: "text-sakura-deep" },
  gold: { bg: "bg-gold-deep", gradient: "bg-grad-gold", ring: "ring-gold", text: "text-gold-deep" },
  matcha: { bg: "bg-matcha-deep", gradient: "bg-grad-matcha", ring: "ring-matcha", text: "text-matcha-deep" },
};

// Offset horizontal untuk pola zig-zag khas Duolingo
const OFFSETS = [0, 56, 88, 56, 0, -56, -88, -56];

export default function LessonPath({
  unit,
  progress,
  unlocked,
}: {
  unit: Unit;
  progress: UserProgress;
  unlocked: boolean;
}) {
  const colors = COLOR_MAP[unit.color];

  return (
    <section className="mb-16">
      <UnitHeader unit={unit} locked={!unlocked} />

      <div className="relative mx-auto mt-10 flex max-w-xs flex-col items-center gap-8 pb-4">
        {unit.lessons.map((lesson, i) => {
          const done = !!progress.lessonProgress[lesson.id]?.completed;
          const prevDone =
            i === 0 ? unlocked : !!progress.lessonProgress[unit.lessons[i - 1].id]?.completed;
          const isAvailable = unlocked && (i === 0 || prevDone || done);
          const offset = OFFSETS[i % OFFSETS.length];

          const showMilestone = i > 0 && i % 4 === 3 && i !== unit.lessons.length - 1;

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="flex flex-col items-center"
            >
              <div
                style={{ transform: `translateX(${offset}px)` }}
                className="flex flex-col items-center"
              >
                <LessonNode
                  lesson={lesson}
                  unitId={unit.id}
                  done={done}
                  available={isAvailable}
                  colors={colors}
                />
                <span
                  className={cn(
                    "mt-2 max-w-[110px] text-center text-xs font-semibold",
                    isAvailable ? "text-ink/70" : "text-ink/30"
                  )}
                >
                  {lesson.title}
                </span>
              </div>
              {showMilestone && <MilestoneMarker unlocked={done} />}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// Dekorasi non-interaktif di jalur (peti harta & maskot), murni tampilan —
// muncul setiap 4 pelajaran, terang kalau sudah pernah sampai situ.
function MilestoneMarker({ unlocked }: { unlocked: boolean }) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center gap-10 transition-opacity",
        unlocked ? "opacity-100" : "opacity-30 grayscale"
      )}
      aria-hidden="true"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-3xl shadow-stamp">
        🎁
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo/10">
          <Bird size={26} className="text-indigo" />
        </div>
        <div className="flex gap-0.5">
          {[0, 1, 2].map((n) => (
            <Star
              key={n}
              size={10}
              className={unlocked ? "fill-gold text-gold" : "fill-ink/15 text-ink/15"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UnitHeader({ unit, locked }: { unit: Unit; locked: boolean }) {
  const colors = COLOR_MAP[unit.color];
  return (
    <div
      className={cn(
        "relative mx-auto flex max-w-md items-center gap-4 overflow-hidden rounded-3xl px-5 py-4 shadow-soft ring-1 ring-white/10",
        colors.gradient,
        locked && "opacity-50 grayscale"
      )}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm">
        {unit.icon}
      </span>
      <div className="relative text-white">
        <p className="font-display text-lg font-bold leading-tight">{unit.title}</p>
        <p className="text-sm opacity-85">
          {unit.titleJp} · {unit.description}
        </p>
      </div>
    </div>
  );
}

function LessonNode({
  lesson,
  unitId,
  done,
  available,
  colors,
}: {
  lesson: { id: string; title: string };
  unitId: string;
  done: boolean;
  available: boolean;
  colors: { bg: string; ring: string; text: string };
}) {
  const content = (
    <div
      className={cn(
        "relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-node transition-all hover:brightness-105 active:translate-y-1 active:shadow-nodePressed",
        available ? cn(colors.bg, "ring-4 ring-white/40") : "bg-ink/10",
        !available && "shadow-none border-ink/5 ring-0"
      )}
    >
      {done ? (
        <Star size={26} className="fill-white text-white" />
      ) : available ? (
        <span className="h-5 w-5 rounded-full bg-white/90" />
      ) : (
        <Lock size={22} className="text-ink/30" />
      )}
      {done && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-white shadow-stamp">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </div>
  );

  if (!available) {
    return <div className="cursor-not-allowed opacity-80">{content}</div>;
  }

  return (
    <Link href={`/lesson/${unitId}/${lesson.id}`} aria-label={`Buka pelajaran ${lesson.title}`}>
      {content}
    </Link>
  );
}
