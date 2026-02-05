export class PlanManager {
    constructor(exams, rules) {
        this.allExams = exams;
        this.rules = rules;
        this.year = "2025/2026";
        this.curriculum = "FBA";
        this.plan = [];
    }

    setYear(year) {
        this.year = year;
    }

    setCurriculum(curriculum) {
        this.curriculum = curriculum;
        this.migratePlan();
    }

    migratePlan() {
        const newPlan = [];
        for (const item of this.plan) {
            if (item.table === 'Obbligatori') {
                newPlan.push(item);
                continue;
            }
            if (item.isCustom) {
                newPlan.push(item);
                continue;
            }
            const exam = this.allExams.find(e => e.id === item.examId);
            if (!exam) continue;

            const allowed = this.getAllowedTables(exam);
            if (allowed.length > 0) {
                item.table = allowed[0];
                newPlan.push(item);
            } else {
                item.table = 'Facoltativi';
                newPlan.push(item);
            }
        }
        this.plan = newPlan;
        this.rebalanceBuckets();
    }

    getAllowedTables(exam) {
        const raw = exam.rawTable || "";
        const parts = raw.split('|').map(s => s.trim());

        if (this.curriculum === 'FBA') {
            return parts.filter(p => ['1', '2'].includes(p));
        } else {
            const allowed = parts.filter(p => ['A', 'B', 'C'].includes(p));
            const priority = { 'A': 1, 'B': 2, 'C': 3 };
            return allowed.sort((a, b) => priority[a] - priority[b]);
        }
    }

    isExamAvailable(exam) {
        const avail = exam.availability;
        if (!avail || avail.toLowerCase() === 'enabled') return true;
        if (avail.toLowerCase() === 'disabled') return false;

        if (avail.startsWith('From ')) {
            const fromYear = avail.replace('From ', '').trim();
            const currentStart = parseInt(this.year.split('/')[0]);
            const fromStart = parseInt(fromYear.split('/')[0]);
            return currentStart >= fromStart;
        }

        if (avail.includes('Biennial')) {
            const currentStart = parseInt(this.year.split('/')[0]);
            const isEvenYear = (currentStart % 2 === 0);
            if (avail.includes('Even')) return isEvenYear;
            if (avail.includes('Odd')) return !isEvenYear;
        }
        return true;
    }

    getNextAvailabilityInfo(exam) {
        const avail = exam.availability;
        if (!avail || avail.toLowerCase() === 'enabled') return null;

        if (avail.startsWith('From ')) return `Disponibile dal ${avail.replace('From ', '')}`;

        if (avail.includes('Biennial')) {
            const currentStart = parseInt(this.year.split('/')[0]);
            const isEvenYear = (currentStart % 2 === 0);
            if (avail.includes('Even') && !isEvenYear) return "Prossima attivazione: Anni Pari (es. 2026/27)";
            if (avail.includes('Odd') && isEvenYear) return "Prossima attivazione: Anni Dispari (es. 2027/28)";
        }
        return avail;
    }

    addExam(exam, targetTable = null) {
        if (this.plan.some(p => p.examId === exam.id)) return false;

        let table = targetTable;
        if (!table) {
            const allowed = this.getAllowedTables(exam);
            table = allowed.length > 0 ? allowed[0] : 'Facoltativi';
        }

        this.plan.push({
            id: exam.id,
            examId: exam.id,
            name: exam.name,
            cfu: exam.cfu,
            table: table,
            isCustom: false
        });
        this.rebalanceBuckets();
        return true;
    }

    addCustomExam(name, cfu, table = 'Facoltativi') {
        this.plan.push({
            id: 'custom-' + Date.now(),
            examId: null,
            name: name,
            cfu: parseInt(cfu),
            table: table,
            isCustom: true
        });
        this.rebalanceBuckets();
    }

    removeExam(planItemId) {
        const item = this.plan.find(p => p.id === planItemId);
        if (item && item.table === 'Obbligatori') return;

        this.plan = this.plan.filter(p => p.id !== planItemId);
        this.rebalanceBuckets();
    }

    moveExam(planItemId, newTable) {
        const item = this.plan.find(p => p.id === planItemId);
        if (item && !item.isCustom && newTable !== 'Facoltativi' && newTable !== 'Obbligatori' && newTable !== 'Fuori Piano') {
            const exam = this.allExams.find(e => e.id === item.examId);
            const allowed = this.getAllowedTables(exam);
            if (!allowed.includes(newTable)) return false;
        }
        if (item) item.table = newTable;
        this.rebalanceBuckets();
        return true;
    }

    rebalanceBuckets() {
        const common = this.rules.degree_requirements.common_rules;
        const freeLimit = common.free_exams_credits || 12;
        
        const limits = this.curriculum === 'FBA' 
            ? { '1': 12, '2': 54, 'Facoltativi': freeLimit } 
            : { 'A': 18, 'B': 30, 'C': 12, 'Facoltativi': freeLimit };

        const newPlan = [];
        const mandatoryItems = this.plan.filter(p => p.table === 'Obbligatori');
        newPlan.push(...mandatoryItems);
        let currentTotal = mandatoryItems.reduce((s, p) => s + p.cfu, 0);

        const activeExams = this.plan.filter(p => p.table !== 'Obbligatori');
        
        activeExams.forEach(item => {
            const exam = this.allExams.find(e => e.id === item.examId);
            const allowed = item.isCustom ? [] : this.getAllowedTables(exam);
            let assigned = false;

            if (currentTotal >= common.total_credits) {
                item.table = 'Fuori Piano';
                newPlan.push(item);
                currentTotal += item.cfu;
                return;
            }

            for (const t of allowed) {
                const currentInT = newPlan.filter(p => p.table === t).reduce((s, p) => s + p.cfu, 0);
                if (currentInT < (limits[t] || 999)) {
                    item.table = t;
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                const currentInFac = newPlan.filter(p => p.table === 'Facoltativi').reduce((s, p) => s + p.cfu, 0);
                if (currentInFac < limits['Facoltativi']) {
                    item.table = 'Facoltativi';
                    assigned = true;
                }
            }

            if (!assigned) item.table = 'Fuori Piano';

            newPlan.push(item);
            currentTotal += item.cfu;
        });

        this.plan = newPlan;
    }

    validate() {
        const common = this.rules.degree_requirements.common_rules;
        const report = { totalCredits: 0, tables: {}, isValid: true, messages: [] };
        const schema = this.curriculum === 'FBA'
            ? ['Obbligatori', '1', '2', 'Facoltativi', 'Fuori Piano']
            : ['Obbligatori', 'A', 'B', 'C', 'Facoltativi', 'Fuori Piano'];

        schema.forEach(t => report.tables[t] = { current: 0, min: 0 });

        this.plan.forEach(item => {
            if (item.table !== 'Fuori Piano') report.totalCredits += item.cfu;
            report.tables[item.table].current += item.cfu;
        });

        const mandatoryTarget = common.mandatory_exams.reduce((s, e) => s + e.credits, 0);
        report.tables['Obbligatori'].min = mandatoryTarget;
        if (report.tables['Obbligatori'].current < mandatoryTarget) {
            report.isValid = false;
            report.messages.push(`Obbligatori: Mancano ${mandatoryTarget - report.tables['Obbligatori'].current} CFU`);
        }

        report.tables['Facoltativi'].min = common.free_exams_credits;
        if (report.tables['Facoltativi'].current < common.free_exams_credits) {
            report.isValid = false;
            report.messages.push(`Facoltativi: Mancano ${common.free_exams_credits - report.tables['Facoltativi'].current} CFU`);
        }

        const progRules = this.rules.degree_requirements.programs[this.curriculum].curriculum_rules;
        let sumABCMin = 0;
        let additionalABC = 0;

        progRules.forEach(rule => {
            if (rule.source === 'ABC') {
                additionalABC = rule.additional_credits;
                return;
            }
            const t = rule.source;
            if (report.tables[t]) {
                report.tables[t].min = rule.min_credits;
                sumABCMin += rule.min_credits;
                if (report.tables[t].current < rule.min_credits) {
                    report.isValid = false;
                    report.messages.push(`Tabella ${t}: Mancano ${rule.min_credits - report.tables[t].current} CFU`);
                }
            }
        });

        if (this.curriculum === 'F94' && additionalABC > 0) {
            const sumABC = report.tables['A'].current + report.tables['B'].current + report.tables['C'].current;
            const targetABC = sumABCMin + additionalABC;
            if (sumABC < targetABC) {
                report.isValid = false;
                report.messages.push(`Somma Tabelle A+B+C: Richiesti ${targetABC} CFU (Attuali: ${sumABC})`);
            }
        }

        if (report.totalCredits < common.total_credits) {
            report.isValid = false;
            report.messages.push(`Piano incompleto: ${report.totalCredits}/${common.total_credits} CFU`);
        }

        return report;
    }

    initDefaults() {
        const mandatory = this.rules.degree_requirements.common_rules.mandatory_exams;
        mandatory.forEach(ex => {
            this.plan.push({
                id: ex.name.toLowerCase().replace(/\s+/g, '-'),
                examId: null,
                name: ex.name,
                cfu: ex.credits,
                table: 'Obbligatori',
                isCustom: true
            });
        });
        this.rebalanceBuckets();
    }
}