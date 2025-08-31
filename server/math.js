const math = require("mathjs");

function generateQuestion(difficulty) {
    let question = {};
    const type = Math.floor(Math.random() * 6); // 0-5 for different types

    switch (type) {
        case 0: // Aritmética fracionária
            const num1 = Math.floor(Math.random() * 10) + 1;
            const den1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const den2 = Math.floor(Math.random() * 10) + 1;
            question.prompt = `Resolva: ${num1}/${den1} + ${num2}/${den2} = ?`;
            question.solution = math.fraction(num1, den1).add(math.fraction(num2, den2)).toFraction();
            question.explanation = `A soma de frações é feita encontrando um denominador comum.`;
            break;
        case 1: // Equações lineares simples
            const a = Math.floor(Math.random() * 5) + 1;
            const b = Math.floor(Math.random() * 10) + 1;
            const c = Math.floor(Math.random() * 15) + 1;
            question.prompt = `Resolva para x: ${a}x + ${b} = ${c}`; 
            question.solution = ((c - b) / a).toFixed(2);
            question.explanation = `Isole x subtraindo ${b} e dividindo por ${a}.`;
            break;
        case 2: // Porcentagem
            const total = (Math.floor(Math.random() * 10) + 1) * 100;
            const percent = Math.floor(Math.random() * 20) + 5;
            question.prompt = `Quanto é ${percent}% de ${total}?`;
            question.solution = (total * percent / 100).toFixed(2);
            question.explanation = `Para calcular a porcentagem, multiplique o total pela porcentagem e divida por 100.`;
            break;
        case 3: // Potências e raízes
            const base = Math.floor(Math.random() * 5) + 2;
            const exp = Math.floor(Math.random() * 3) + 2;
            question.prompt = `Quanto é ${base}^${exp}?`;
            question.solution = Math.pow(base, exp);
            question.explanation = `A potência ${base}^${exp} significa ${base} multiplicado por ele mesmo ${exp} vezes.`;
            break;
        case 4: // MMC/MDC
            const numA = Math.floor(Math.random() * 20) + 5;
            const numB = Math.floor(Math.random() * 20) + 5;
            question.prompt = `Qual o MMC de ${numA} e ${numB}?`;
            question.solution = math.lcm(numA, numB);
            question.explanation = `O MMC (Mínimo Múltiplo Comum) é o menor número que é múltiplo de ambos.`;
            break;
        case 5: // Proporções
            const val1 = Math.floor(Math.random() * 10) + 1;
            const val2 = Math.floor(Math.random() * 10) + 1;
            const val3 = Math.floor(Math.random() * 10) + 1;
            question.prompt = `Se ${val1} está para ${val2} assim como ${val3} está para x, qual o valor de x?`;
            question.solution = ((val2 * val3) / val1).toFixed(2);
            question.explanation = `Use a regra de três: ${val1} * x = ${val2} * ${val3}.`;
            break;
    }

    question.id = `math_q_${type}_${Date.now()}`;
    question.topic = `Matemática`;
    question.difficulty = difficulty;
    question.payload_json = JSON.stringify({ prompt: question.prompt });
    return question;
}

function validateAnswer(question, userAnswer) {
    // Basic validation for now. Can be expanded for tolerance/algebraic equivalence.
    return String(question.solution) === String(userAnswer);
}

module.exports = {
    generateQuestion,
    validateAnswer,
};


