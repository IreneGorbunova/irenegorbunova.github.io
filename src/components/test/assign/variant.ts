// The tasks of one pupil's variant, drawn by the trainer's own engine (src/components/trainer/engine.mjs) from seeds
// made of the assignment id, the variant number and the task number. The same inputs always give the same tasks,
// so the teacher's page regenerates any pupil's variant from the number in the result code.
import { generate } from '../../trainer/engine.mjs';
import { taskSeed, type Assignment } from './code.ts';

export interface Task {
	tpl: any;
	inst: { v: Record<string, any>; answer: number };
}

export const variantTasks = (templates: any[], order: string[], a: Assignment, v: number): Task[] => {
	const byId = new Map(templates.map((t) => [t.id, t]));
	const list = order.map((id) => byId.get(id)).filter(Boolean);
	const tasks: Task[] = [];
	for (let i = 0; i < a.count; i++) {
		const tpl = list[i % list.length];
		let inst = null;
		// a template draws a problem for more than 99 % of seeds; the next seeds of the same task cover the rest
		for (let k = 0; !inst && k < 20; k++) inst = generate(tpl, taskSeed(a, v, i, k));
		tasks.push({ tpl, inst });
	}
	return tasks;
};
