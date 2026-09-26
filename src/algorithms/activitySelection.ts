import { ActivityData, ActivitySelectionStep } from '../types';

export const activitySelectionCode = [
  "function selectActivities(activities) {",
  "  // Sort activities by end time",
  "  activities.sort((a, b) => a.end - b.end);",
  "  ",
  "  const selected = [];",
  "  let lastEndTime = 0;",
  "  ",
  "  for (const activity of activities) {",
  "    if (activity.start >= lastEndTime) {",
  "      selected.push(activity);",
  "      lastEndTime = activity.end;",
  "    }",
  "  }",
  "  ",
  "  return selected;",
  "}"
];

export function generateActivitySelectionSteps(activities: ActivityData[]): ActivitySelectionStep[] {
  const steps: ActivitySelectionStep[] = [];
  
  if (activities.length === 0) {
    steps.push({
      type: 'complete',
      selectedIds: [],
      count: 0,
      description: 'No activities to select.',
      lines: [16]
    });
    return steps;
  }

  // Create a sorted copy
  const sorted = [...activities].sort((a, b) => a.end - b.end);
  
  steps.push({
    type: 'sort-by-end-time',
    description: 'Sort all activities by their end time (earliest finishing first).',
    lines: [3]
  });

  const selectedIds: string[] = [];
  let lastEndTime = -Infinity; // Initialize to negative infinity to handle any start time
  let lastSelectedId: string | null = null;
  
  // To handle conflicts correctly, we need to know what we conflict with.
  // The greedy algorithm compares activity.start to lastEndTime.
  // If it's < lastEndTime, it conflicts with the last selected activity.
  
  for (const activity of sorted) {
    steps.push({
      type: 'consider',
      activityId: activity.id,
      description: `Consider ${activity.label} (Start: ${activity.start}, End: ${activity.end}).`,
      lines: [8, 9]
    });

    if (activity.start >= lastEndTime) {
      selectedIds.push(activity.id);
      lastEndTime = activity.end;
      lastSelectedId = activity.id;
      
      steps.push({
        type: 'select',
        activityId: activity.id,
        lastEndTime,
        description: `Compatible! Start time (${activity.start}) >= last end time. Select ${activity.label}.`,
        lines: [10, 11]
      });
    } else {
      steps.push({
        type: 'reject',
        activityId: activity.id,
        conflictsWith: lastSelectedId!,
        description: `Incompatible. Start time (${activity.start}) overlaps with previously selected activity.`,
        lines: [9]
      });
    }
  }

  steps.push({
    type: 'complete',
    selectedIds,
    count: selectedIds.length,
    description: `Selected ${selectedIds.length} of ${activities.length} activities optimally.`,
    lines: [15]
  });

  return steps;
}
