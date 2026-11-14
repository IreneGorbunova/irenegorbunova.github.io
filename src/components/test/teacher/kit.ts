// The teacher's kit on a chapter page (pilot, loaded only in test mode on the chapters of config.ts):
// a row «Для учителя» under the title (worksheet, assignment) and a button «Показать на уроке» above every model.
// Everything added carries data-ig-test, so it disappears with test mode; the chapter's own markup is not changed.

import './kit.css';
import { TEACHER_CHAPTERS, type ModelCfg } from './config';
import { present } from './present';
import { openWorksheet, type SheetModel } from './worksheet';

const ICON_SCREEN =
	'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8M10 8.5v4l3.5-2z"/></svg>';
const ICON_PRINT =
	'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 13h10v8H7z"/></svg>';
const ICON_TASK =
	'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8M9 2.5h6v3H9zM6 4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-1M8 11l2 2 4-4M8 17h8"/></svg>';

const mark = (e: HTMLElement) => {
	e.dataset.igTest = '';
	e.dataset.pagefindIgnore = '';
	e.dataset.igk = '';
	return e;
};

export const start = () => {
	if (document.documentElement.dataset.igTestmode !== '1') return;
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	const path = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
	const id = path.slice(base.length).replace(/\/$/, '');
	const chapter = TEACHER_CHAPTERS[id];
	if (!chapter) return;

	// the models, found by their own root elements
	const found: SheetModel[] = [];
	const used = new Set<Element>();
	for (const cfg of chapter.models as ModelCfg[]) {
		const fig = document.querySelectorAll<HTMLElement>(cfg.sel)[cfg.nth ?? 0];
		if (!fig || used.has(fig)) continue;
		used.add(fig);
		found.push({ fig, cfg });
	}

	// «Показать на уроке» above each model
	for (const { fig, cfg } of found) {
		const bar = mark(document.createElement('div'));
		bar.className = 'igk-mbar not-content';
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'igk-btn igk-btn--sm';
		b.innerHTML = `${ICON_SCREEN}<span>Показать на уроке</span>`;
		b.setAttribute('aria-label', `Показать на уроке: ${cfg.name}`);
		b.addEventListener('click', () => present(fig, cfg.name, b));
		bar.append(b);
		fig.before(bar);
	}

	// «Для учителя» under the title
	const row = mark(document.createElement('div'));
	row.className = 'igk-row not-content';
	const label = document.createElement('span');
	label.className = 'igk-row__label';
	label.textContent = 'Для учителя';
	const ws = document.createElement('button');
	ws.type = 'button';
	ws.className = 'igk-btn';
	ws.innerHTML = `${ICON_PRINT}<span>Рабочий лист</span>`;
	ws.addEventListener('click', () => openWorksheet(chapter, found, path, ws));
	row.append(label, ws);
	if (chapter.assign) {
		const a = document.createElement('a');
		a.className = 'igk-btn';
		a.href = `${base}uchebnik/test/zadanie/?t=${chapter.assign}`;
		a.innerHTML = `${ICON_TASK}<span>Задание классу</span>`;
		row.append(a);
	}
	const h1 = document.querySelector('h1');
	const after = h1?.parentElement?.querySelector(':scope > .csky') ?? h1;
	after?.after(row);
};
