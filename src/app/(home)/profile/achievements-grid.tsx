import { ACHIEVEMENTS, type AchievementStats } from "@/lib/achievements";

const ANIMATION_CSS = `
  @keyframes ach-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes ach-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ach-bubble { 0%{opacity:0;transform:translateY(0) scale(.5)} 30%{opacity:.75} 100%{opacity:0;transform:translateY(-20px) scale(1.1)} }
  @keyframes ach-gleam { 0%,70%,100%{opacity:0} 40%,55%{opacity:1} }
  @keyframes ach-dot { 0%,60%,100%{transform:translateY(0);opacity:.35} 30%{transform:translateY(-3px);opacity:1} }
  .ach-float{animation:ach-float 3.2s ease-in-out infinite}
  .ach-spin{animation:ach-spin 10s linear infinite;transform-box:fill-box;transform-origin:center}
  .ach-b1{animation:ach-bubble 2.1s ease-out infinite}
  .ach-b2{animation:ach-bubble 2.1s ease-out .7s infinite}
  .ach-b3{animation:ach-bubble 2.1s ease-out 1.4s infinite}
  .ach-gleam{animation:ach-gleam 3.5s ease-in-out infinite}
  .ach-d1{animation:ach-dot 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  .ach-d2{animation:ach-dot 1.4s ease-in-out .28s infinite;transform-box:fill-box;transform-origin:center}
  .ach-d3{animation:ach-dot 1.4s ease-in-out .56s infinite;transform-box:fill-box;transform-origin:center}
`;

function ExplorerIcon({ unlocked }: { unlocked: boolean }) {
  const m = unlocked ? "#6366f1" : "#9ca3af";
  const l = unlocked ? "#a5b4fc" : "#d1d5db";
  const s = unlocked ? "#fbbf24" : "#d1d5db";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className={unlocked ? "ach-float" : ""}>
      <defs>
        <linearGradient id="ach-exp-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={l} />
          <stop offset="100%" stopColor={m} />
        </linearGradient>
      </defs>
      {/* Main tube */}
      <rect x="8" y="17" width="23" height="10" rx="3" fill="url(#ach-exp-g)" />
      {/* Eyepiece */}
      <rect x="29" y="19" width="9" height="6" rx="2" fill={l} />
      {/* Objective lens */}
      <circle cx="10" cy="22" r="5.5" fill={m} opacity="0.6" />
      <circle cx="10" cy="22" r="3.2" fill={unlocked ? "#e0e7ff" : "#f3f4f6"} opacity="0.9" />
      {/* Lens gleam */}
      {unlocked && (
        <circle cx="8.8" cy="20.5" r="1.1" fill="white" opacity="0.9" className="ach-gleam" />
      )}
      {/* Tripod */}
      <line x1="16" y1="27" x2="12" y2="37" stroke={m} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="22" y1="27" x2="24" y2="37" stroke={m} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="37" x2="24" y2="37" stroke={m} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Stars */}
      <circle cx="36" cy="8" r="1.6" fill={s} />
      <circle cx="40" cy="14" r="1" fill={s} opacity="0.75" />
      <circle cx="31" cy="5" r="1" fill={s} opacity="0.65" />
      <circle cx="39" cy="5" r="0.7" fill={s} opacity="0.5" />
    </svg>
  );
}

function DeepDiverIcon({ unlocked }: { unlocked: boolean }) {
  const m = unlocked ? "#0891b2" : "#9ca3af";
  const bg = unlocked ? "#e0f2fe" : "#f3f4f6";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      {/* Strap */}
      <rect x="14" y="9" width="16" height="6" rx="3" fill={m} opacity="0.5" />
      {/* Outer frame */}
      <rect x="5" y="14" width="34" height="17" rx="5" fill={m} opacity="0.12" stroke={m} strokeWidth="1.5" />
      {/* Nose bridge */}
      <rect x="18.5" y="18" width="7" height="9" rx="2.5" fill={m} opacity="0.35" />
      {/* Left lens */}
      <circle cx="12.5" cy="22.5" r="7" fill={bg} stroke={m} strokeWidth="1.5" />
      {/* Right lens */}
      <circle cx="31.5" cy="22.5" r="7" fill={bg} stroke={m} strokeWidth="1.5" />
      {/* Lens highlights */}
      {unlocked && (
        <>
          <circle cx="10.5" cy="20" r="2.2" fill="white" opacity="0.7" />
          <circle cx="29.5" cy="20" r="2.2" fill="white" opacity="0.7" />
        </>
      )}
      {/* Bubbles */}
      {unlocked && (
        <>
          <circle cx="12.5" cy="34" r="2" fill={m} opacity="0.45" className="ach-b1" />
          <circle cx="22" cy="36" r="1.3" fill={m} opacity="0.35" className="ach-b2" />
          <circle cx="31.5" cy="34" r="2" fill={m} opacity="0.45" className="ach-b3" />
        </>
      )}
    </svg>
  );
}

function CartographerIcon({ unlocked }: { unlocked: boolean }) {
  const m = unlocked ? "#d97706" : "#9ca3af";
  const bg = unlocked ? "#fef3c7" : "#f3f4f6";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="18" fill={bg} stroke={m} strokeWidth="1.5" />
      {/* Cardinal ticks */}
      <line x1="22" y1="6" x2="22" y2="11.5" stroke={m} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="22" y1="32.5" x2="22" y2="38" stroke={m} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="6" y1="22" x2="11.5" y2="22" stroke={m} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="32.5" y1="22" x2="38" y2="22" stroke={m} strokeWidth="2.2" strokeLinecap="round" />
      {/* Diagonal ticks */}
      <line x1="9.8" y1="9.8" x2="13" y2="13" stroke={m} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="31" y1="31" x2="34.2" y2="34.2" stroke={m} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="34.2" y1="9.8" x2="31" y2="13" stroke={m} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="9.8" y1="34.2" x2="13" y2="31" stroke={m} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      {/* Needle — rotates when unlocked */}
      <g className={unlocked ? "ach-spin" : ""}>
        <polygon points="22,9 24,22 22,20 20,22" fill={unlocked ? "#ef4444" : "#d1d5db"} />
        <polygon
          points="22,35 24,22 22,24 20,22"
          fill={unlocked ? "#fef2f2" : "#e5e7eb"}
          stroke={unlocked ? "#fca5a5" : "#d1d5db"}
          strokeWidth="0.5"
        />
      </g>
      {/* Center jewel */}
      <circle cx="22" cy="22" r="2.8" fill={m} />
      <circle cx="22" cy="22" r="1.4" fill={unlocked ? "#fef3c7" : "#f3f4f6"} />
    </svg>
  );
}

function ConversationalistIcon({ unlocked }: { unlocked: boolean }) {
  const m = unlocked ? "#059669" : "#9ca3af";
  const bg = unlocked ? "#d1fae5" : "#f3f4f6";
  const dot = unlocked ? "#059669" : "#d1d5db";
  // Combined bubble + tail path: rounded rect (5,8)→(39,30) rx=7, tail pointing down-left
  const bubblePath =
    "M12 8 L32 8 Q39 8 39 15 L39 23 Q39 30 32 30 L18 30 L5 40 L12 30 Q5 30 5 23 L5 15 Q5 8 12 8 Z";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <path d={bubblePath} fill={bg} stroke={m} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="15" cy="19" r="2.5" fill={dot} className={unlocked ? "ach-d1" : ""} />
      <circle cx="22" cy="19" r="2.5" fill={dot} className={unlocked ? "ach-d2" : ""} />
      <circle cx="29" cy="19" r="2.5" fill={dot} className={unlocked ? "ach-d3" : ""} />
    </svg>
  );
}

function AchievementIcon({ id, unlocked }: { id: string; unlocked: boolean }) {
  switch (id) {
    case "explorer": return <ExplorerIcon unlocked={unlocked} />;
    case "deep_diver": return <DeepDiverIcon unlocked={unlocked} />;
    case "cartographer": return <CartographerIcon unlocked={unlocked} />;
    case "conversationalist": return <ConversationalistIcon unlocked={unlocked} />;
    default: return null;
  }
}

interface AchievementsGridProps {
  stats: AchievementStats;
}

export function AchievementsGrid({ stats }: AchievementsGridProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Achievements</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            let unlocked = false;
            let tier = 0;
            let label = "";
            let description = "";
            let lockedHint = "";

            if (a.type === "tiered") {
              const count = a.getCount(stats);
              for (let i = 0; i < a.tiers.length; i++) {
                if (count >= a.tiers[i].threshold) tier = i + 1;
              }
              unlocked = tier > 0;
              label = tier > 1 ? `${a.baseLabel} ×${tier}` : a.baseLabel;
              description = unlocked ? a.tiers[tier - 1].description : "";
              lockedHint = a.lockedRequirement;
            } else {
              unlocked = a.isUnlocked(stats);
              label = a.label;
              description = a.description;
              lockedHint = a.requirement;
            }

            return (
              <div
                key={a.id}
                title={unlocked ? description : `Locked — ${lockedHint}`}
                className={`relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
                  unlocked
                    ? "border-gray-100 bg-gradient-to-b from-white to-gray-50 shadow-sm"
                    : "border-gray-100 opacity-40 grayscale"
                }`}
              >
                {tier > 1 && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-700">
                    ×{tier}
                  </span>
                )}
                <AchievementIcon id={a.id} unlocked={unlocked} />
                <span className="text-xs font-semibold leading-tight text-gray-800">{label}</span>
                <span className="text-[10px] leading-tight text-gray-500">
                  {unlocked ? description : lockedHint}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
