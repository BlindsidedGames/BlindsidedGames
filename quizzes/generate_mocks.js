const fs = require('fs');

const categories = ['History', 'Science', 'Sport', 'Biology', 'Geography'];
const difficulties = ['Easy', 'Medium', 'Hard'];
const dailySchedule = { version: 2, mode: 'pool', entries: [] };
const generatedFiles = [];
const MAX_DAILY_FILES = 21;

categories.forEach((cat) => {
    difficulties.forEach((diff) => {
        for (let i = 1; i <= 2; i++) {
            if (generatedFiles.length >= MAX_DAILY_FILES) {
                return;
            }
            const id = `${cat.toLowerCase()}_${diff.toLowerCase()}_0${i}`;
            const file = `${id}.json`;

            const quizData = {
                id,
                title: `${diff} ${cat} Quiz ${i}`,
                sections: [
                    {
                        title: cat,
                        items: Array.from({ length: 10 }, (_, qIdx) => {
                            const isTrueFalse = qIdx >= 8;
                            if (isTrueFalse) {
                                const answer = qIdx % 2 === 0 ? 'True' : 'False';
                                return {
                                    type: 'true-false',
                                    q: `Mock ${diff} ${cat} true or false question ${qIdx + 1}?`,
                                    a: answer,
                                    options: ['True', 'False'],
                                    explanation: 'Mock explanation'
                                };
                            }

                            const answer = `Correct Answer ${qIdx + 1}`;
                            if (qIdx === 0 && cat === 'Science') {
                                return {
                                    type: 'multiple-choice',
                                    q: 'At standard atmospheric pressure, water boils at what temperature?',
                                    a: '{{measure|100|c|0}}',
                                    options: [
                                        '{{measure|90|c|0}}',
                                        '{{measure|95|c|0}}',
                                        '{{measure|100|c|0}}',
                                        '{{measure|110|c|0}}'
                                    ],
                                    explanation: 'At lower air pressure, water boils at a lower temperature than {{measure|100|c|0}}.'
                                };
                            }
                            return {
                                type: 'multiple-choice',
                                q: `Mock ${diff} ${cat} question ${qIdx + 1}?`,
                                a: answer,
                                options: [
                                    answer,
                                    `Distractor ${qIdx + 1}A`,
                                    `Distractor ${qIdx + 1}B`,
                                    `Distractor ${qIdx + 1}C`
                                ],
                                explanation: 'Mock explanation'
                            };
                        })
                    }
                ]
            };

            fs.writeFileSync(`./quizzes/${file}`, JSON.stringify(quizData, null, 2));
            generatedFiles.push({ id, category: cat, difficulty: diff, file });
        }
    });
});

const startDate = new Date('2026-03-09T00:00:00Z');
generatedFiles.forEach((entry, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    dailySchedule.entries.push({
        id: `daily.${entry.id}`,
        title: `${entry.category} Daily Challenge`,
        category: entry.category,
        difficulty: entry.difficulty,
        file: entry.file,
        publishedAt: date.toISOString()
    });
});

fs.writeFileSync('./quizzes/daily_schedule.json', JSON.stringify(dailySchedule, null, 2));
console.log("Mock daily quiz data generated.");
