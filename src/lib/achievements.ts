export interface AchievementStats {
  paperCount: number;
  summarizedCount: number;
  hasMap: boolean;
  hasChat: boolean;
}

export interface TieredAchievement {
  id: string;
  type: "tiered";
  baseLabel: string;
  tiers: Array<{ threshold: number; description: string }>;
  getCount: (stats: AchievementStats) => number;
  lockedRequirement: string;
}

export interface SingleAchievement {
  id: string;
  type: "single";
  label: string;
  description: string;
  requirement: string;
  isUnlocked: (stats: AchievementStats) => boolean;
}

export type Achievement = TieredAchievement | SingleAchievement;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "explorer",
    type: "tiered",
    baseLabel: "Explorer",
    tiers: [
      { threshold: 1, description: "Saved your first paper" },
      { threshold: 10, description: "Saved 10 papers" },
      { threshold: 25, description: "Saved 25 papers" },
      { threshold: 50, description: "Saved 50 papers" },
      { threshold: 100, description: "Saved 100 papers" },
    ],
    getCount: (s) => s.paperCount,
    lockedRequirement: "Save your first paper",
  },
  {
    id: "deep_diver",
    type: "tiered",
    baseLabel: "Deep Diver",
    tiers: [
      { threshold: 5, description: "Summarized 5 papers" },
      { threshold: 20, description: "Summarized 20 papers" },
      { threshold: 50, description: "Summarized 50 papers" },
    ],
    getCount: (s) => s.summarizedCount,
    lockedRequirement: "Summarize 5 papers",
  },
  {
    id: "cartographer",
    type: "single",
    label: "Cartographer",
    description: "Generated your research map",
    requirement: "Generate your map",
    isUnlocked: (s) => s.hasMap,
  },
  {
    id: "conversationalist",
    type: "single",
    label: "Conversationalist",
    description: "Used the AI chat feature",
    requirement: "Start an AI chat",
    isUnlocked: (s) => s.hasChat,
  },
];
