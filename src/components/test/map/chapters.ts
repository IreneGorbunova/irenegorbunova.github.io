/**
 * The course map (test mode pilot): per chapter, one line on what the chapter gives (at most 90 characters; the
 * chapters' own descriptions are longer, so every line here is written for the map, for Irina to review) and the
 * number of the paragraph in Перышкин's textbook, left empty until the edition is chosen. Keyed by the chapter's slug.
 * The chapters themselves, their order and sections come from the sidebar (astro.config.mjs) at build time.
 */
export interface MapChapter {
	line: string;
	/** Перышкин's paragraph(s), e.g. '§ 1–2'; empty: not shown */
	peryshkin?: string;
}

/** Grades whose course is complete: the status line says «полный курс». */
export const COMPLETE_GRADES = new Set(['8 класс']);

const nb = (s: string) => s.replace(/(\d) (°C)/g, '$1 $2'); // a number keeps its unit

export const MAP_CHAPTERS: Record<string, MapChapter> = {
	'vnutrennyaya-energiya': { line: 'Тепловое движение, два способа изменить энергию тела и три вида теплопередачи.', peryshkin: '' },
	'kolichestvo-teploty': { line: 'От чего зависит количество теплоты для нагревания и как найти температуру смеси.', peryshkin: '' },
	'energiya-topliva': { line: 'Сколько теплоты дают дрова, уголь и бензин и что такое КПД нагревателя.', peryshkin: '' },
	'zakon-sohraneniya-energii': { line: 'Куда девается механическая энергия, опыт Джоуля и почему нет вечного двигателя.', peryshkin: '' },
	'plavlenie': { line: nb('Почему лёд тает при 0 °C и куда уходит теплота, пока он тает.'), peryshkin: '' },
	'vlazhnost': { line: 'Почему высыхают лужи, что такое точка росы и как измеряют влажность.', peryshkin: '' },
	'isparenie-i-kipenie': { line: nb('Как кипит жидкость и почему в горах вода закипает ниже 100 °C.'), peryshkin: '' },
	'teplovye-dvigateli': { line: 'Как двигатель внутреннего сгорания и паровая турбина превращают энергию топлива в работу.', peryshkin: '' },
	'elektrizaciya': { line: 'Как тела получают заряд, как взаимодействуют заряды и как устроен атом.', peryshkin: '' },
	'elektricheskiy-tok': { line: 'Откуда берётся ток, как он идёт в металлах, его действия и схемы цепей.', peryshkin: '' },
	'sila-toka-napryazhenie-soprotivlenie': { line: 'Как измерить силу тока и напряжение, от чего зависит сопротивление и зачем реостат.', peryshkin: '' },
	'zakon-oma': { line: 'Как сила тока зависит от напряжения и сопротивления; вольт-амперная характеристика.', peryshkin: '' },
	'soedinenie-provodnikov': { line: 'Сила тока, напряжение и сопротивление в гирляндах, проводке и смешанных цепях.', peryshkin: '' },
	'rabota-i-moshchnost-toka': { line: 'Что показывает счётчик, сколько стоит электроэнергия и зачем нужны предохранители.', peryshkin: '' },
	'magnitnoe-pole-toka': { line: 'Опыт Эрстеда, магнитные линии, поле прямого тока и катушки с током.', peryshkin: '' },
	'elektromagnity': { line: 'Как железный сердечник усиливает катушку с током; реле и электрический звонок.', peryshkin: '' },
	'postoyannye-magnity': { line: 'Полюсы магнита, компас, поле магнита и как намагничивается железо.', peryshkin: '' },
	'magnitnoe-pole-zemli': { line: 'Почему компас показывает на север, магнитные бури и полярные сияния.', peryshkin: '' },
	'elektrodvigatel': { line: 'Почему рамка с током поворачивается в магнитном поле и как работают стрелочные приборы.', peryshkin: '' },
	'istochniki-sveta': { line: 'Световой луч, тень и полутень, затмения, камера-обскура и скорость света.', peryshkin: '' },
	'otrazhenie-sveta': { line: 'Закон отражения, изображение в зеркале, зеркальное и рассеянное отражение.', peryshkin: '' },
	'prelomlenie-sveta': { line: 'Закон преломления, показатель преломления, «сломанная» ложка и полное отражение.', peryshkin: '' },
	'linzy': { line: 'Собирающая и рассеивающая линзы, фокус, оптическая сила и построение изображений.', peryshkin: '' },
	'glaz-i-zrenie': { line: 'Как глаз видит близкое и далёкое, близорукость, дальнозоркость и очки.', peryshkin: '' },
};
