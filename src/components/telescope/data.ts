/**
 * «Посмотри в телескоп»: the telescopes and the objects (./Telescope.astro, ./telescope.ts).
 *
 * A telescope is described by what sets what it shows:
 *  - `d`: the diameter of the lens or mirror, mm (the eye: the pupil in the dark);
 *  - `theta`: the smallest detail it tells apart, arc seconds. Diffraction gives 138″ / d (550 nm); below a sky that
 *    boils it is never better than about 1″ (the seeing); the first telescopes were worse than their diffraction
 *    limit because of their lenses and mirrors. The value is the largest of the three, rounded;
 *  - `mlim`: the faintest stars it reaches, magnitudes (the eye at the eyepiece: about 2 + 5 lg d; plates and
 *    electronic cameras go much deeper with long exposures);
 *  - `fov`: its true field of view, arc seconds (for a camera: the frame); `mag`: the magnification used;
 *  - `how`: the eye at the eyepiece, a black-and-white photographic plate, an electronic camera, an infrared camera;
 *  - `chroma`: the colored fringes of a single lens.
 * An object is a picture (public/telescope/, NASA and ESA, public domain) whose width on the sky is `width` arc
 * seconds; `see` says how much of a faint object each telescope shows, from 0 (nothing) to 1 (everything in the
 * picture): the surface brightness of a nebula or a galaxy, not only the diameter, decides it, so these are set by
 * hand from what observers of the time recorded.
 */
export type How = 'eye' | 'visual' | 'plate' | 'ccd' | 'ir';
export interface Scope {
	id: string;
	name: string;
	short: string;
	year: string;
	where: string;
	d: number;
	theta: number;
	mlim: number;
	fov: number;
	mag?: number;
	how: How;
	chroma?: boolean;
	text: string;
}
export const HOW: Record<How, string> = {
	eye: 'просто глазами',
	visual: 'глазом в окуляр',
	plate: 'на чёрно-белую фотопластинку',
	ccd: 'электронной камерой',
	ir: 'инфракрасной камерой',
};

export const SCOPES: Scope[] = [
	{
		id: 'eye',
		name: 'Невооружённый глаз',
		short: 'Глаз',
		year: 'всегда',
		where: 'любое тёмное место',
		d: 7,
		theta: 60,
		mlim: 6,
		fov: 36000,
		mag: 1,
		how: 'eye',
		text: 'В темноте зрачок раскрывается примерно до 7 мм. Глаз различает детали размером около одной угловой минуты и видит на всём небе примерно 6000 звёзд.',
	},
	{
		id: 'galileo',
		name: 'Зрительная труба Галилея',
		short: 'Галилей',
		year: '1609',
		where: 'Падуя, Италия',
		d: 20,
		theta: 10,
		mlim: 8.5,
		fov: 900,
		mag: 20,
		how: 'visual',
		chroma: true,
		text: 'Две линзы в свинцовой трубке: увеличение в 20 раз и поле зрения в половину лунного диска. Простая линза окружает яркие предметы цветной каймой, но и этого хватило, чтобы увидеть горы на Луне и спутники Юпитера.',
	},
	{
		id: 'newton',
		name: 'Зеркальный телескоп Ньютона',
		short: 'Ньютон',
		year: '1668',
		where: 'Кембридж, Англия',
		d: 33,
		theta: 5,
		mlim: 9.5,
		fov: 1500,
		mag: 35,
		how: 'visual',
		text: 'Вместо линзы — вогнутое зеркало из сплава меди и олова диаметром 3,3 см. Зеркало отражает лучи всех цветов одинаково, поэтому цветной каймы нет. Весь телескоп был длиной около 15 см.',
	},
	{
		id: 'herschel',
		name: 'Двадцатифутовый телескоп Гершеля',
		short: 'Гершель',
		year: '1783',
		where: 'Англия, близ Виндзора',
		d: 475,
		theta: 1.5,
		mlim: 15,
		fov: 900,
		mag: 157,
		how: 'visual',
		text: 'Зеркало диаметром 47 см в шестиметровой трубе. Уильям Гершель с сестрой Каролиной ночь за ночью просматривали небо и занесли в каталоги около 2500 туманностей и звёздных скоплений. Резкость теперь ограничивает дрожание воздуха.',
	},
	{
		id: 'rosse',
		name: '«Левиафан» лорда Росса',
		short: 'Росс',
		year: '1845',
		where: 'Бирр, Ирландия',
		d: 1830,
		theta: 1.5,
		mlim: 17.5,
		fov: 360,
		mag: 400,
		how: 'visual',
		text: 'Зеркало диаметром 1,83 м между двумя каменными стенами — самый большой телескоп мира до 1917 года. В него впервые увидели, что некоторые туманности закручены в спираль.',
	},
	{
		id: 'hooker',
		name: 'Телескоп Хукера',
		short: 'Хукер',
		year: '1917',
		where: 'обсерватория Маунт-Вилсон, США',
		d: 2540,
		theta: 1,
		mlim: 21,
		fov: 1200,
		how: 'plate',
		text: 'Зеркало 2,54 м и фотопластинка вместо глаза: за часы выдержки она накапливает свет и запоминает то, чего не увидеть в окуляр. На этом телескопе Эдвин Хаббл нашёл цефеиды в туманности Андромеды и открыл разбегание галактик.',
	},
	{
		id: 'bta',
		name: 'БТА — Большой телескоп азимутальный',
		short: 'БТА',
		year: '1975',
		where: 'Нижний Архыз, Северный Кавказ',
		d: 6050,
		theta: 1.2,
		mlim: 26,
		fov: 366,
		how: 'ccd',
		text: 'Шестиметровое зеркало на высоте 2070 м — самый большой телескоп мира до 1993 года. Света он собирает в 750 тысяч раз больше глаза, но резкость по-прежнему ограничена атмосферой.',
	},
	{
		id: 'hubble',
		name: 'Космический телескоп «Хаббл»',
		short: '«Хаббл»',
		year: '1990',
		where: 'орбита, 540 км над Землёй',
		d: 2400,
		theta: 0.05,
		mlim: 30,
		fov: 162,
		how: 'ccd',
		text: 'Зеркало 2,4 м, меньше, чем у телескопа Хукера, но над атмосферой: воздух не дрожит и не светится. Резкость — пять сотых угловой секунды, в двадцать раз лучше, чем с Земли.',
	},
	{
		id: 'webb',
		name: 'Космический телескоп «Джеймс Уэбб»',
		short: '«Уэбб»',
		year: '2021',
		where: 'в 1,5 млн км от Земли',
		d: 6500,
		theta: 0.07,
		mlim: 31,
		fov: 132,
		how: 'ir',
		text: 'Зеркало 6,5 м из 18 позолоченных сегментов, охлаждённое до −230 °C. Телескоп видит инфракрасный свет: он проходит сквозь пыль и приходит от самых далёких галактик, свет которых растянут расширением Вселенной.',
	},
];

export interface Target {
	id: string;
	name: string;
	/** file in public/telescope/ without the extension */
	file: string;
	/** pixels of the picture */
	w: number;
	h: number;
	/** width of the picture on the sky, arc seconds */
	width: number;
	/** bright: the Moon and the planets (every telescope shows them in full light); stars: a star field;
	 *  faint: a nebula or galaxies */
	kind: 'bright' | 'stars' | 'faint';
	/** km per arc second at the object's distance (bodies of the Solar system) */
	km?: number;
	where?: string;
	/** how much each telescope shows of a faint object, 0…1 */
	see?: Record<string, number>;
	size: string;
	ref: string;
	about: string;
	/** what was seen through a particular telescope */
	notes: Record<string, string>;
	credit: string;
	source: string;
}

export const TARGETS: Target[] = [
	{
		id: 'moon',
		name: 'Луна',
		file: 'moon',
		w: 1800,
		h: 1800,
		width: 2120,
		kind: 'bright',
		km: 1.864,
		where: 'на Луне',
		size: 'Поперечник диска — 31′, до Луны 384 000 км',
		ref: 'Снимки зонда LRO, 2010 год',
		about: 'Глаз различает на Луне только тёмные пятна морей. Всё остальное открыл телескоп.',
		notes: {
			eye: 'Тёмные пятна — лунные моря. Самые мелкие детали, которые различает глаз, — больше 100 км.',
			galileo: 'Осенью 1609 года Галилей увидел на Луне горы и кратеры и по длине теней оценил высоту гор. Луна не помещалась в поле зрения целиком.',
			newton: 'Изображение чистое, без цветной каймы по краю диска.',
			hubble: '«Хаббл» различил бы на Луне детали от 90 м. Этот снимок такой резкости не передаёт: одна его точка — около 2 км.',
		},
		credit: 'NASA / GSFC / Arizona State University',
		source: 'https://commons.wikimedia.org/wiki/File:LRO_WAC_Nearside_Mosaic.jpg',
	},
	{
		id: 'mars',
		name: 'Марс',
		file: 'mars',
		w: 500,
		h: 500,
		width: 28,
		kind: 'bright',
		km: 270,
		where: 'на Марсе',
		size: 'Поперечник диска на снимке — 25″: в августе 2003 года Марс подошёл к Земле на 56 млн км, ближе, чем за многие тысячи лет',
		ref: '«Хаббл», 2003 год',
		about: 'Красноватая «звезда», которая раз в два года разгорается ярче всех. Даже в лучшие дни её диск в 70 раз меньше лунного.',
		notes: {
			eye: 'Яркая красноватая точка без диска.',
			galileo: 'Крошечный кружок. Галилей заметил только, что он не всегда идеально круглый: у Марса бывает небольшая фаза.',
			newton: 'Диск без цветной каймы; на нём едва угадывается тёмное пятно.',
			herschel: 'Гершель следил за полярными шапками: они растут и тают, значит, на Марсе есть времена года.',
			hubble: 'Южная полярная шапка, тёмные области и облака. Самые мелкие детали — около 15 км.',
		},
		credit: 'NASA, Hubble Heritage Team (STScI / AURA)',
		source: 'https://commons.wikimedia.org/wiki/File:Mars_Hubble.jpg',
	},
	{
		id: 'jupiter',
		name: 'Юпитер',
		file: 'jupiter',
		w: 940,
		h: 940,
		width: 39.3,
		kind: 'bright',
		km: 3909,
		where: 'на Юпитере',
		size: 'Поперечник диска на снимке — 37″, до планеты 800 млн км',
		ref: '«Хаббл», 2014 год',
		about: 'Для глаза Юпитер — яркая точка. Диск, полосы и Большое красное пятно показывает только телескоп.',
		notes: {
			eye: 'Яркая «звезда» без диска: поперечник Юпитера меньше того, что различает глаз.',
			galileo: 'В январе 1610 года Галилей увидел у Юпитера маленький диск и четыре «звёздочки» рядом, которые каждую ночь меняли места. Это были спутники: посмотрите на поле зрения внизу слева.',
			newton: 'Диск без цветной каймы; на нём угадываются две тёмные полосы.',
			herschel: 'Полосы облаков и Большое красное пятно видны уверенно.',
			hubble: 'Вихри, вплетённые в полосы, и Большое красное пятно — ураган размером больше Земли.',
		},
		credit: 'NASA, ESA, A. Simon (Goddard Space Flight Center)',
		source: 'https://commons.wikimedia.org/wiki/File:Jupiter_and_its_shrunken_Great_Red_Spot.jpg',
	},
	{
		id: 'saturn',
		name: 'Сатурн',
		file: 'saturn',
		w: 1800,
		h: 982,
		width: 46.3,
		kind: 'bright',
		km: 6440,
		where: 'на Сатурне',
		size: 'Кольца — 42″ в поперечнике, до планеты 1,3 млрд км',
		ref: '«Хаббл», 2004 год',
		about: 'Кольца Сатурна не видны глазом. Первые телескопы показывали их так плохо, что полвека никто не понимал, что это.',
		notes: {
			eye: 'Желтоватая «звезда». Колец не видно.',
			galileo: 'В 1610 году Галилей решил, что Сатурн «тройной»: по бокам планеты он видел два придатка. Что это кольцо, понял Христиан Гюйгенс только в 1655–1656 годах, с телескопом получше.',
			newton: 'Придатки по бокам уже похожи на кольцо, но щель между кольцом и шаром планеты едва различима.',
			herschel: 'В кольце видна тёмная щель Кассини, открытая в 1675 году.',
			hubble: 'Видны десятки колец и тень планеты на них.',
		},
		credit: 'NASA, ESA, E. Karkoschka (University of Arizona)',
		source: 'https://commons.wikimedia.org/wiki/File:Saturn_HST_2004-03-22.jpg',
	},
	{
		id: 'pleiades',
		name: 'Плеяды',
		file: 'pleiades',
		w: 1800,
		h: 1298,
		width: 4920,
		kind: 'stars',
		size: 'Ширина кадра — 1,4°, до скопления 440 световых лет',
		ref: 'Паломарская обсерватория, фотографический обзор неба',
		about: 'Звёздное скопление в созвездии Тельца. Чем больше света собирает телескоп, тем больше в нём звёзд.',
		notes: {
			eye: 'Зоркий глаз видит шесть или семь звёзд.',
			galileo: 'Галилей насчитал в Плеядах 36 звёзд и зарисовал их в «Звёздном вестнике».',
			herschel: 'Звёзд уже сотни.',
			hooker: 'На фотопластинке проступает голубая дымка — пыль, которая отражает свет звёзд.',
			bta: 'В скоплении больше тысячи звёзд, а голубая дымка — пыль, сквозь которую оно сейчас проходит.',
		},
		credit: 'NASA, ESA, AURA / Caltech, Palomar Observatory',
		source: 'https://commons.wikimedia.org/wiki/File:Pleiades_large.jpg',
	},
	{
		id: 'orion',
		name: 'Туманность Ориона',
		file: 'orion',
		w: 1800,
		h: 1800,
		width: 1800,
		kind: 'faint',
		see: { eye: 0.12, galileo: 0.2, newton: 0.27, herschel: 0.55, rosse: 0.68, hooker: 0.88, bta: 1, hubble: 1, webb: 1 },
		size: 'Ширина кадра — 30′, как у лунного диска; до туманности 1300 световых лет',
		ref: '«Хаббл», 2006 год',
		about: 'Облако газа и пыли, в котором рождаются звёзды. Его видно глазом как туманное пятнышко в «мече» Ориона.',
		notes: {
			eye: 'Туманное пятнышко на месте средней звезды «меча» Ориона.',
			galileo: 'В такую трубу в 1610 году туманность заметил француз Никола де Пейреск.',
			herschel: 'Гершель видел светящееся облако с четырьмя звёздами в середине — Трапецией. Глаз в окуляре не различает цвета слабого света, поэтому туманность серая.',
			hooker: 'Фотопластинка накапливает свет: проявляются слабые края облака.',
			hubble: 'Около трёх тысяч звёзд, многие ещё окружены дисками пыли, из которых получатся планеты.',
		},
		credit: 'NASA, ESA, M. Robberto (STScI / ESA), Hubble Space Telescope Orion Treasury Project Team',
		source: 'https://commons.wikimedia.org/wiki/File:Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg',
	},
	{
		id: 'm51',
		name: 'Галактика Водоворот',
		file: 'm51',
		w: 1800,
		h: 1249,
		width: 574,
		kind: 'faint',
		see: { eye: 0, galileo: 0, newton: 0.06, herschel: 0.2, rosse: 0.5, hooker: 0.86, bta: 1, hubble: 1, webb: 1 },
		size: 'Ширина кадра — 9,6′, до галактики около 28 млн световых лет',
		ref: '«Хаббл», 2005 год',
		about: 'Спиральная галактика в созвездии Гончих Псов. Её открыл в 1773 году Шарль Мессье как туманное пятно.',
		notes: {
			eye: 'Не видна: галактика почти в десять раз слабее самых слабых звёзд, доступных глазу.',
			galileo: 'Не видна: объектив слишком мал.',
			newton: 'На пределе: едва заметное туманное пятнышко.',
			herschel: 'Два туманных пятна рядом, без всяких подробностей.',
			rosse: 'Весной 1845 года лорд Росс впервые разглядел спиральные ветви и зарисовал их. Это была первая «спиральная туманность».',
			hooker: 'Фотопластинка показывает спираль во всех подробностях. В 1920-е годы на этом телескопе доказали, что спиральные туманности — далёкие галактики.',
			hubble: 'В розовых облаках вдоль спиральных ветвей рождаются звёзды.',
		},
		credit: 'NASA, ESA',
		source: 'https://commons.wikimedia.org/wiki/File:Messier51_sRGB.jpg',
	},
	{
		id: 'ring',
		name: 'Туманность Кольцо',
		file: 'ring',
		w: 1215,
		h: 1241,
		width: 122,
		kind: 'faint',
		see: { eye: 0, galileo: 0, newton: 0.05, herschel: 0.5, rosse: 0.68, hooker: 0.9, bta: 1, hubble: 1, webb: 1 },
		size: 'Ширина кадра — 2′, кольцо около 1′ в поперечнике; до туманности примерно 2500 световых лет',
		ref: '«Хаббл», 1998 год',
		about: 'Оболочка газа, сброшенная умирающей звездой, в созвездии Лиры. Её открыли в 1779 году в телескоп с объективом в несколько сантиметров.',
		notes: {
			eye: 'Не видна: туманность в десять с лишним раз слабее предела глаза.',
			galileo: 'Не видна: слишком мала и слаба для такой трубы.',
			newton: 'На пределе: звёздочка, чуть размытая по сравнению с соседними.',
			herschel: 'Гершель видел светлое кольцо с тёмной серединой и назвал его «дырявой туманностью».',
			hooker: 'На фотопластинке в центре кольца видна слабая звезда — остывающее ядро, сбросившее оболочку.',
			hubble: 'Цвета — свечение разных газов: гелия в середине, кислорода и азота по краям.',
		},
		credit: 'The Hubble Heritage Team (AURA / STScI / NASA)',
		source: 'https://commons.wikimedia.org/wiki/File:M57_The_Ring_Nebula.JPG',
	},
	{
		id: 'crab',
		name: 'Крабовидная туманность',
		file: 'crab',
		w: 1800,
		h: 1800,
		width: 386,
		kind: 'faint',
		see: { eye: 0, galileo: 0, newton: 0.04, herschel: 0.3, rosse: 0.52, hooker: 0.85, bta: 1, hubble: 1, webb: 1 },
		size: 'Ширина кадра — 6,4′, до туманности 6500 световых лет',
		ref: '«Хаббл», 2005 год',
		about: 'Остаток звезды, взрыв которой видели в 1054 году. Газ до сих пор разлетается со скоростью 1500 км/с.',
		notes: {
			eye: 'Пусто. А в 1054 году здесь вспыхнула звезда, видная даже днём: её записали китайские астрономы.',
			galileo: 'Не видна: объектив слишком мал.',
			newton: 'На пределе: едва заметное пятнышко.',
			herschel: 'Овальное туманное пятно без подробностей.',
			rosse: 'В 1844 году лорд Росс зарисовал у туманности светлые отростки, похожие на ноги краба. Отсюда её название.',
			hooker: 'По фотографиям разных лет заметили, что туманность расширяется, и вычислили, когда произошёл взрыв.',
			hubble: 'Оранжевые волокна — остатки звезды. Голубое свечение внутри создаёт пульсар: нейтронная звезда, которая вращается 30 раз в секунду.',
		},
		credit: 'NASA, ESA, J. Hester, A. Loll (Arizona State University)',
		source: 'https://commons.wikimedia.org/wiki/File:Crab_Nebula.jpg',
	},
	{
		id: 'pillars',
		name: 'Столпы Творения',
		file: 'pillars',
		w: 1800,
		h: 1877,
		width: 266,
		kind: 'faint',
		see: { eye: 0, galileo: 0, newton: 0, herschel: 0.08, rosse: 0.18, hooker: 0.6, bta: 0.85, hubble: 1, webb: 1 },
		size: 'Ширина кадра — 4,4′, до туманности около 6500 световых лет; высота левого столпа — примерно 4 световых года',
		ref: '«Хаббл», 2014 год',
		about: 'Колонны холодного газа и пыли в туманности Орёл. Внутри них рождаются звёзды, а свет соседних горячих звёзд понемногу их разрушает.',
		notes: {
			eye: 'Пусто.',
			galileo: 'Пусто.',
			newton: 'Пусто.',
			herschel: 'Слабое свечение вокруг звёздного скопления. Столпов не разглядеть.',
			rosse: 'Свечение чуть заметнее, но тёмные столпы на его фоне глазу не видны.',
			hooker: 'На фотографиях с долгой выдержкой впервые проступают тёмные «хоботы слона».',
			hubble: 'Самый знаменитый снимок «Хаббла», впервые сделанный в 1995 году.',
		},
		credit: 'NASA, ESA, Hubble Heritage Team (STScI / AURA)',
		source: 'https://commons.wikimedia.org/wiki/File:Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg',
	},
	{
		id: 'sombrero',
		name: 'Галактика Сомбреро',
		file: 'sombrero',
		w: 1800,
		h: 1009,
		width: 574,
		kind: 'faint',
		see: { eye: 0, galileo: 0, newton: 0.05, herschel: 0.38, rosse: 0.58, hooker: 0.88, bta: 1, hubble: 1, webb: 1 },
		size: 'Ширина кадра — 9,6′, до галактики около 30 млн световых лет',
		ref: '«Хаббл», 2003 год',
		about: 'Галактика в созвездии Девы, повёрнутая к нам почти ребром. Тёмная полоса — кольцо пыли в её диске.',
		notes: {
			eye: 'Не видна.',
			galileo: 'Не видна: объектив слишком мал.',
			newton: 'На пределе: едва заметная чёрточка.',
			herschel: 'Вытянутое туманное пятно. В 1784 году Гершель заметил у него тёмную полосу.',
			hooker: 'Именно у этой туманности в 1912 году впервые измерили огромную скорость удаления — 1000 км/с. Позже такие измерения привели к открытию расширения Вселенной.',
			hubble: 'Вокруг галактики видны около двух тысяч шаровых звёздных скоплений.',
		},
		credit: 'NASA / ESA, Hubble Heritage Team (STScI / AURA)',
		source: 'https://commons.wikimedia.org/wiki/File:M104_ngc4594_sombrero_galaxy_hi-res.jpg',
	},
	{
		id: 'deep',
		name: 'Глубокое поле',
		file: 'deep',
		w: 1800,
		h: 1837,
		width: 144,
		kind: 'faint',
		see: { eye: 0, galileo: 0, newton: 0, herschel: 0, rosse: 0, hooker: 0.25, bta: 0.62, hubble: 0.88, webb: 1 },
		size: 'Ширина кадра — 2,4′: участок неба размером с песчинку на вытянутой руке',
		ref: '«Джеймс Уэбб», 2022 год',
		about: 'Скопление галактик в созвездии Летучей Рыбы. Свет от него шёл 4,6 млрд лет, а от галактик на заднем плане — больше 13 млрд.',
		notes: {
			eye: 'Пустое место на небе.',
			galileo: 'Пустое место на небе.',
			newton: 'Пустое место на небе.',
			herschel: 'Пустое место на небе.',
			rosse: 'Всё ещё пусто: галактики здесь в тысячи раз слабее предела телескопа.',
			hooker: 'На пластинке с многочасовой выдержкой появляются самые яркие галактики скопления.',
			bta: 'Видны сотни галактик скопления, но слабые сливаются с фоном неба.',
			hubble: 'Тысячи галактик. Дуги — изображения далёких галактик, искажённые тяготением скопления.',
			webb: 'Первый научный снимок «Уэбба»: 12,5 часа выдержки. Красные точки — галактики, свет которых вышел, когда Вселенной было меньше миллиарда лет.',
		},
		credit: 'NASA, ESA, CSA, STScI',
		source: 'https://commons.wikimedia.org/wiki/File:Webb%27s_First_Deep_Field.jpg',
	},
];

/** Where the four large moons of Jupiter stand in the eyepiece view, arc seconds east (+) or west (−) of the planet. */
export const JUPITER_MOONS = [
	{ name: 'Ио', x: -112 },
	{ name: 'Европа', x: 186 },
	{ name: 'Ганимед', x: -298 },
	{ name: 'Каллисто', x: 405 },
];
