/**
 * The prediction questions of the pilot («Сначала предскажите, потом проверьте», test mode only).
 * A chapter places one with `<Predict id="…" />` right before the model it asks about.
 *
 *  question  one or two sentences about what the model will show after a concrete action
 *  options   2–3 answers; the wrong ones aim at common misconceptions
 *  answer    index of the right option
 *  check     what to do in the model to check the prediction
 *  outcome   what the model shows (opens both verdicts)
 *  reason    why it is so (the verdict after a right prediction)
 *  myths     per option: «Так думают многие: …» and why that idea fails ('' at the answer)
 *  trigger   the condition in triggers.ts that shows the verdict; without it a «Я проверил(а)» button appears
 *
 * Strings may contain $…$ (KaTeX at build) and <i>…</i>. A space between a number and its unit becomes a no-break
 * space by itself (text.ts). Every number was checked by operating the model (tools/shots/t1-verify.mjs).
 */
export interface Question {
	question: string;
	options: string[];
	answer: number;
	check: string;
	outcome: string;
	reason: string;
	myths: string[];
	trigger?: string;
}

export const QUESTIONS: Record<string, Question> = {
	// «Количество теплоты», HeatDeps, mode «Изменение температуры»: 1 kg of water by 10, 20, 30 °C → 42, 84, 126 kJ.
	'kt-deps-dt': {
		question:
			'Воду массой 1 кг нагревают от 20 °C до 30 °C и от 20 °C до 50 °C. Во сколько раз больше теплоты нужно во втором случае?',
		options: [
			'Примерно в 1,7 раза — во столько раз 50 °C больше, чем 30 °C',
			'В 3 раза',
			'Столько же: масса воды одна и та же',
		],
		answer: 1,
		check: 'Выберите в модели «Изменение температуры» и включите нагреватели. Сравните <i>Q</i> у первого и третьего сосудов.',
		outcome: 'Вода получила 42 кДж и 126 кДж — в 3 раза больше.',
		reason: 'Количество теплоты зависит не от того, до какой температуры нагрели воду, а от того, на сколько градусов: на 30 °C вместо 10 °C.',
		myths: [
			'Так думают многие: кажется, что количество теплоты зависит от самой температуры. Но важно, на сколько градусов нагрели воду: на 30 °C вместо 10 °C, то есть в 3 раза больше.',
			'',
			'Так думают многие: масса та же, значит, и теплоты нужно столько же. Но чем на большее число градусов нагревают воду, тем больше теплоты ей нужно.',
		],
		trigger: 'heatdeps-dt',
	},

	// «Количество теплоты», HeatRace: 1 kg each from 20 °C to 100 °C at 1000 J/s: iron 36,8 s … water 336 s (9,1 times).
	'kt-race-last': {
		question:
			'На одинаковых плитках нагревают по 1 кг воды, масла, песка, алюминия и железа. Какое вещество нагреется до 100 °C последним?',
		options: ['Железо: металл плотный, его труднее прогреть', 'Вода', 'Все одновременно: массы одинаковые и плитки одинаковые'],
		answer: 1,
		check: 'Включите нагреватели и дождитесь, пока все вещества нагреются до 100 °C.',
		outcome: 'Первым до 100 °C нагрелось железо, последней — вода: она нагревалась примерно в 9 раз дольше.',
		reason: 'Чтобы нагреть 1 кг воды на 1 °C, нужно 4200 Дж, а 1 кг железа — всего 460 Дж.',
		myths: [
			'Так думают многие: плотный металл кажется трудным для нагревания. Но массы одинаковые, а на нагревание 1 кг железа на 1 °C нужно всего 460 Дж, воды — 4200 Дж.',
			'',
			'Так думают многие: раз массы и плитки одинаковые, то и нагреваются вещества одинаково. Но теплота зависит и от вещества: 1 кг воды на 1 °C нужно 4200 Дж, а 1 кг железа — всего 460 Дж.',
		],
		trigger: 'heatrace-done',
	},

	// «Закон Ома», CircuitKit preset «ohm»: an ideal source; the voltmeter across the resistor reads the source voltage
	// at any resistance (4,5 В at 10 and 20 Ом), the ammeter 0,45 А and 0,23 А.
	'zo-kit-voltmeter': {
		question:
			'Цепь собрана, ключ замкнут. Сопротивление резистора увеличат с 10 Ом до 20 Ом, а напряжение источника оставят прежним. Что покажет вольтметр?',
		options: ['Больше, чем раньше: сопротивление выросло', 'Меньше, чем раньше: сила тока уменьшилась', 'Столько же, сколько раньше'],
		answer: 2,
		check: 'Соберите цепь, замкните ключ и запомните показания приборов. Потом нажмите на резистор и передвиньте ползунок до 20 Ом.',
		outcome: 'Вольтметр показывал одно и то же, а сила тока уменьшилась.',
		reason: 'Напряжение на резисторе задаёт источник. Сопротивление выросло — и сила тока во столько же раз уменьшилась, а произведение $IR$ осталось прежним.',
		myths: [
			'Так думают многие: по формуле $U = IR$ кажется, что напряжение растёт вместе с сопротивлением. Но сила тока во столько же раз уменьшилась, и произведение $IR$ осталось прежним: напряжение задаёт источник.',
			'Так думают многие: раз ток стал меньше, то и напряжение уменьшится. Но ток уменьшился потому, что выросло сопротивление, а напряжение на резисторе задаёт источник.',
			'',
		],
		trigger: 'circuit-voltmeter-same',
	},

	// «Закон Ома», OhmLab: the voltmeter is connected across the rheostat; with the key open I = 0 and U = 0.
	'zo-lab-key': {
		question: 'Ключ замкнут, вольтметр показывает 6 В. Что он покажет, если ключ разомкнуть?',
		options: ['По-прежнему 6 В: источник остался в цепи', 'Ноль'],
		answer: 1,
		check: 'Нажмите «Разомкнуть ключ» под схемой или на сам ключ и посмотрите на вольтметр.',
		outcome: 'Вольтметр показал ноль.',
		reason: 'Он подключён к реостату, а не к источнику. Когда тока нет, напряжение на реостате $U = IR = 0$.',
		myths: [
			'Так думают многие: источник остался в цепи, значит, и напряжение есть. Но вольтметр подключён к реостату, а не к источнику: когда тока нет, напряжение на реостате $U = IR = 0$.',
			'',
		],
		trigger: 'ohmlab-key-open',
	},
};
