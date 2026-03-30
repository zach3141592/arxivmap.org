import { ACHIEVEMENTS, type AchievementId } from "@/lib/achievements";

interface AchievementsGridProps {
  unlockedIds: Set<AchievementId>;
}

export function AchievementsGrid({ unlockedIds }: AchievementsGridProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Achievements</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              title={unlocked ? a.description : `Locked — ${a.requirement}`}
              className={`flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 px-3 py-4 text-center transition-opacity ${
                unlocked ? "bg-gray-50" : "opacity-40 grayscale"
              }`}
            >
              <span className="text-2xl leading-none">{a.icon}</span>
              <span className="text-xs font-semibold text-gray-800">{a.label}</span>
              <span className="text-[10px] leading-tight text-gray-500">
                {unlocked ? a.description : a.requirement}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
