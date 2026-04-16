import { TaskBrief, Sprint } from "../types";

// Mock AI service - generates plans locally without external API
export const aiService = {
  async generateDailyPlan(tasks: TaskBrief[], sprint: Sprint) {
    // Simple local planning algorithm based on task priority and dependencies
    const incompleteTasks = tasks.filter(t => !t.meta.status || t.meta.status !== 'Done');

    // Group tasks by priority if available
    const todayTasks = incompleteTasks.slice(0, 5).map(t => ({
      taskId: t.id,
      title: t.goal.split('.').slice(0, 2).join('.').substring(0, 50),
      estimatedTime: "1h",
      action: t.goal
    }));

    const tomorrowTasks = incompleteTasks.slice(5, 10).map(t => ({
      taskId: t.id,
      title: t.goal.split('.').slice(0, 2).join('.').substring(0, 50),
      estimatedTime: "1h",
      action: t.goal
    }));

    const day3Tasks = incompleteTasks.slice(10, 15).map(t => ({
      taskId: t.id,
      title: t.goal.split('.').slice(0, 2).join('.').substring(0, 50),
      estimatedTime: "1h",
      action: t.goal
    }));

    return [
      { day: 'Today', tasks: todayTasks },
      { day: 'Tomorrow', tasks: tomorrowTasks },
      { day: 'Day 3', tasks: day3Tasks }
    ].filter(day => day.tasks.length > 0);
  },

  async detectLinks(tasks: TaskBrief[]) {
    // Simple local link detection based on task relationships
    const links: Array<{ sourceId: string; targetId: string; type: string; rationale: string }> = [];

    // Check for explicit relations in task metadata
    tasks.forEach(task => {
      if (task.meta.relations) {
        task.meta.relations.forEach((rel: any) => {
          links.push({
            sourceId: task.id,
            targetId: rel.targetId || rel,
            type: rel.type || 'related-to',
            rationale: 'Auto-detected from task relations'
          });
        });
      }
    });

    return links;
  }
};
