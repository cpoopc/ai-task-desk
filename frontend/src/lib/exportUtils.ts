
import { TaskBrief } from '../types';

export const exportContext = (task: TaskBrief) => {
  const briefMarkdown = `
# Task Brief: ${task.goal}
- Path: ${task.path}
- Status: ${task.meta.status}

## Technical Details
${task.technicalDetails}

## Constraints
${task.constraints.map(c => `- ${c}`).join('\n')}

## Metrics
${task.metrics.map(m => `- ${m.name} (${m.type}): ${m.description}`).join('\n')}

## Checklist
${task.checklist.map(i => `${i.completed ? '[x]' : '[ ]'} ${i.text} (${i.priority})`).join('\n')}

## Decisions
${task.decisions.map(d => `### ${d.question}\n- Ans: ${d.answer}\n- Why: ${d.rationale}`).join('\n')}
  `;

  return {
    '.cursorrules': briefMarkdown,
    'CLAUDE.md': briefMarkdown,
    'AGENTS.md': briefMarkdown,
  };
};
