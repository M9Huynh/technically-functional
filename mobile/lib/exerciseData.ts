export type Exercise = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  demoText?: string; // for now we’ll show demo as text
  enabled: boolean;  // only single leg raises should be enabled for now
  tags?: string[];
};

export const RECOMMENDED_EXERCISES: Exercise[] = [
  {
    id: "single-leg-raises",
    title: "Single Leg Raises",
    subtitle: "Recommended #1",
    description:
      "Lie on your back with one leg bent and the other straight. Tighten your quad and raise the straight leg slowly, then lower with control.",
    demoText: "Demo: (placeholder) Single Leg Raises video/gif goes here",
    enabled: true,
    tags: ["quad", "knee rehab", "beginner"],
  },
  {
    id: "recommended-2",
    title: "Exercise Recommendation #2",
    subtitle: "Recommended #2",
    description:
      "Placeholder exercise. This will be replaced with a real recommendation later.",
    demoText: "Demo: coming soon",
    enabled: false,
    tags: ["coming soon"],
  },
];

export const SIMILAR_EXERCISES: Exercise[] = [
  {
    id: "quad-sets",
    title: "Quad Sets",
    description: "Placeholder similar exercise.",
    enabled: false,
  },
  {
    id: "heel-slides",
    title: "Heel Slides",
    description: "Placeholder similar exercise.",
    enabled: false,
  },
  {
    id: "short-arc-quads",
    title: "Short Arc Quads",
    description: "Placeholder similar exercise.",
    enabled: false,
  },
];
