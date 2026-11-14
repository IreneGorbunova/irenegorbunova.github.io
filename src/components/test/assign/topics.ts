// Topics of «Задание классу»: chapters that have the trainer «Решите сами» (src/data/problems/). The code is the
// short name in the link; `order` is the order of the trainer's templates in an assignment (easy to hard), repeated
// with new numbers when the teacher asks for more tasks than there are templates.
export interface Topic {
	slug: string;
	title: string;
	chapter: string;
	order: string[];
}

export const TOPICS: Record<string, Topic> = {
	kt: {
		slug: 'kolichestvo-teploty',
		title: 'Количество теплоты. Удельная теплоёмкость',
		chapter: 'uchebnik/8-klass/teplovye-yavleniya/kolichestvo-teploty/',
		order: ['nagrev', 'na-skolko', 'smes', 'kastrulya', 'kalorimetr'],
	},
};
