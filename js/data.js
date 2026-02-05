/**
 * Parses CSV text containing exam data.
 * Uses PapaParse if available, otherwise falls back to a minimal internal parser.
 * @param {string} csvText - The raw CSV string.
 * @returns {Array<Object>} List of processed exam objects.
 */
export function parseExams(csvText) {
    if (typeof Papa === 'undefined') {
        return minimalCSVParse(csvText);
    }

    const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim()
    });

    if (results.errors && results.errors.length > 0) {
        console.error("CSV Parsing Errors:", results.errors);
    }

    return results.data.map(processExamRow);
}

/**
 * Minimal CSV parser implementation for fallback purposes.
 * Handles basic comma separation and quoted fields.
 * @param {string} text - The raw CSV string.
 * @returns {Array<Object>} List of processed exam objects.
 */
function minimalCSVParse(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const row = [];
        let inQuote = false;
        let current = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current);

        if (row.length === headers.length) {
            const obj = {};
            headers.forEach((h, index) => {
                obj[h] = row[index] ? row[index].trim() : '';
            });
            data.push(processExamRow(obj));
        }
    }
    return data;
}

/**
 * Transforms a raw CSV row object into a structured exam object.
 * @param {Object} row - Key-value pair row from CSV parser.
 * @returns {Object} Structured exam object with normalized fields.
 */
function processExamRow(row) {
    return {
        id: row['Exams'],
        name: row['Exams'],
        link: row['link'],
        cfu: parseInt(row['CFU']) || 6,
        language: row['Language'],
        period: parseInt(row['Period']) || 1,
        ordinamento: row['ordinamento'] ? row['ordinamento'].split('|').map(x => x.trim()) : [],
        rawTable: row['table'],
        ssd: row['SSD'],
        pillar: row['Pillar'],
        subpillar: row['Subpillar'],
        availability: row['avaiability']
    };
}

/**
 * Fetches and loads application data (exams and rules).
 * @returns {Promise<{exams: Array, rules: Object|null}>} A promise resolving to an object containing exams and rules.
 */
export async function loadData() {
    try {
        const [examsResponse, rulesResponse] = await Promise.all([
            fetch('exams.csv'),
            fetch('rules.json')
        ]);

        const examsText = await examsResponse.text();
        const exams = parseExams(examsText);
        const rules = await rulesResponse.json();

        return { exams, rules };
    } catch (error) {
        console.error("Failed to load data:", error);
        return { exams: [], rules: null };
    }
}
