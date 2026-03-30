export type AchievementId =
  | "first_paper"
  | "explorer"
  | "bibliophile"
  | "scholar"
  | "archivist"
  | "cartographer"
  | "deep_diver"
  | "conversationalist";

export interface Achievement {
  id: AchievementId;
  label: string;
  description: string;
  icon: string;
  requirement: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_paper",
    label: "First Paper",
    description: "Saved your first paper",
    icon: "📄",
    requirement: "Save 1 paper",
  },
  {
    id: "explorer",
    label: "Explorer",
    description: "Saved 10 or more papers",
    icon: "🔭",
    requirement: "Save 10 papers",
  },
  {
    id: "bibliophile",
    label: "Bibliophile",
    description: "Saved 25 or more papers",
    icon: "📚",
    requirement: "Save 25 papers",
  },
  {
    id: "scholar",
    label: "Scholar",
    description: "Saved 50 or more papers",
    icon: "🎓",
    requirement: "Save 50 papers",
  },
  {
    id: "archivist",
    label: "Archivist",
    description: "Saved 100 or more papers",
    icon: "🗃️",
    requirement: "Save 100 papers",
  },
  {
    id: "cartographer",
    label: "Cartographer",
    description: "Generated your research map",
    icon: "🗺️",
    requirement: "Generate your map",
  },
  {
    id: "deep_diver",
    label: "Deep Diver",
    description: "Generated AI summaries for 5 or more papers",
    icon: "🤿",
    requirement: "Summarize 5 papers",
  },
  {
    id: "conversationalist",
    label: "Conversationalist",
    description: "Used the AI chat feature",
    icon: "💬",
    requirement: "Start an AI chat",
  },
];

export interface AchievementStats {
  paperCount: number;
  summarizedCount: number;
  hasMap: boolean;
  hasChat: boolean;
}

export function computeUnlocked(stats: AchievementStats): Set<AchievementId> {
  const unlocked = new Set<AchievementId>();
  if (stats.paperCount >= 1) unlocked.add("first_paper");
  if (stats.paperCount >= 10) unlocked.add("explorer");
  if (stats.paperCount >= 25) unlocked.add("bibliophile");
  if (stats.paperCount >= 50) unlocked.add("scholar");
  if (stats.paperCount >= 100) unlocked.add("archivist");
  if (stats.hasMap) unlocked.add("cartographer");
  if (stats.summarizedCount >= 5) unlocked.add("deep_diver");
  if (stats.hasChat) unlocked.add("conversationalist");
  return unlocked;
}
