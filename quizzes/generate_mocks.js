const fs = require('fs');

const categories = ['History', 'Science', 'Sport', 'Biology', 'Geography'];
const difficulties = ['Easy', 'Medium', 'Hard'];

const manifest = { version: 4, quizzes: [] };

categories.forEach((cat) => {
    difficulties.forEach((diff) => {
        for (let i = 1; i <= 2; i++) {
            const id = `${cat.toLowerCase()}_${diff.toLowerCase()}_0${i}`;
            const file = `${id}.json`;

            manifest.quizzes.push({
                id,
                category: cat,
                difficulty: diff,
                file
            });

            const quizData = {
                id,
                title: `${diff} ${cat} Quiz ${i}`,
                sections: [
                    {
                        title: cat,
                        items: Array.from({ length: 10 }, (_, qIdx) => ({
                            type: 'self-eval',
                            q: `Mock ${diff} ${cat} Question ${qIdx + 1}?`,
                            a: "Mock Answer",
                            explanation: "Mock Explanation"
                        }))
                    }
                ]
            };

            fs.writeFileSync(`./quizzes/${file}`, JSON.stringify(quizData, null, 2));
        }
    });
});

fs.writeFileSync('./quizzes/manifest.json', JSON.stringify(manifest, null, 2));
console.log("Mock data generated.");
