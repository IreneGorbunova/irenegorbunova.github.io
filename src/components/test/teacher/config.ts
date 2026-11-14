// The teacher's kit (pilot, test mode only): the chapters that get it, and their models.
// A model is found by its own root element (`sel`, the nth match on the page), never by its position, so a block
// wrapped around it (a prediction, for example) does not matter. `name` is shown in the presentation view and on the
// worksheet; `pic` names a picture of the model's initial state in ./pics/ (made by tools/shots/t3-make-pics.mjs from
// the element `picSel` inside the model, light theme). `assign` is the topic code of «Задание классу» (assign/topics.ts).

export interface ModelCfg {
	sel: string;
	nth?: number;
	name: string;
	pic?: string;
	picSel?: string;
	/** false: left off the worksheet at first (the teacher can tick it); for chapters whose models fill more than two pages */
	sheet?: boolean;
}

export interface ChapterCfg {
	grade: string;
	models: ModelCfg[];
	assign?: string;
}

export const TEACHER_CHAPTERS: Record<string, ChapterCfg> = {
	'uchebnik/8-klass/teplovye-yavleniya/kolichestvo-teploty': {
		grade: '8 класс',
		assign: 'kt',
		models: [
			{ sel: 'figure.ktdeps', name: 'Нагревание воды: масса и изменение температуры' },
			{ sel: 'figure.ktrace', name: 'Нагревание разных веществ', pic: 'ktrace', picSel: '.ktrace__bench' },
			{ sel: 'figure.kttab', name: 'Таблица удельных теплоёмкостей' },
			{ sel: 'figure.ktmix', name: 'Калориметр: смешивание', pic: 'ktmix', picSel: '.ktmix__stage' },
			{ sel: 'figure.cal', name: 'Устройство калориметра' },
		],
	},
	'uchebnik/8-klass/elektricheskie-yavleniya/zakon-oma': {
		grade: '8 класс',
		models: [
			{ sel: 'figure.od', nth: 0, name: 'Сила тока и напряжение' },
			{ sel: 'figure.od', nth: 1, name: 'Сила тока и сопротивление' },
			{ sel: 'figure.olet', name: 'Закон Ома: буквы и числа', pic: 'olet', picSel: '.olet__stage', sheet: false },
			{ sel: 'figure.otri', name: 'Треугольник закона Ома', pic: 'otri', picSel: '.otri__top', sheet: false },
			{ sel: 'figure.ck', name: 'Соберите цепь сами', pic: 'ck', picSel: '.ck__wrap' },
			{ sel: 'figure.gread', name: 'Вольт-амперная характеристика', pic: 'gread', picSel: '.gread__svg' },
			{ sel: 'figure.ohm', name: 'Опыт. Цепь с реостатом', pic: 'ohm', picSel: '.ohm__circuit' },
		],
	},
};

/** The live address of the textbook (the QR code on a worksheet leads there, wherever the sheet was printed). */
export const SITE = 'https://irenegorbunova.github.io';
