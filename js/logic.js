/**
 * Manages the study plan logic, including adding/removing exams, validating rules,
 * and handling curriculum specific requirements.
 */
export class PlanManager {
  /**
   * Creates an instance of PlanManager.
   * @param {Array} exams - List of available exams.
   * @param {Object} rules - The degree requirements and rules.
   * @param {Function} t - Translation function.
   */
  constructor(exams, rules, t) {
    this.allExams = exams;
    this.rules = rules;
    this.t = t || ((k) => k);
    this.year = "2025/2026";
    this.curriculum = "FBA";
    this.plan = [];
  }

  /**
   * Sets the academic year.
   * @param {string} year - The academic year to set (e.g., "2025/2026").
   */
  setYear(year) {
    this.year = year;
  }

  /**
   * Sets the curriculum and migrates the current plan to the new curriculum.
   * @param {string} curriculum - The curriculum code (e.g., "FBA", "F94").
   */
  setCurriculum(curriculum) {
    this.curriculum = curriculum;
    this.migratePlan();
  }

  /**
   * Migrates the current plan items to fit the new curriculum structure.
   * Re-evaluates allowed tables for each exam.
   */
  migratePlan() {
    const newPlan = [];
    for (const item of this.plan) {
      if (item.table === "Obbligatori") {
        newPlan.push(item);
        continue;
      }
      if (item.isCustom) {
        newPlan.push(item);
        continue;
      }
      const exam = this.allExams.find((e) => e.id === item.examId);
      if (!exam) continue;

      const allowed = this.getAllowedTables(exam);
      if (allowed.length > 0) {
        item.table = allowed[0];
        newPlan.push(item);
      } else {
        item.table = "Facoltativi";
        newPlan.push(item);
      }
    }
    this.plan = newPlan;
    this.rebalanceBuckets();
  }

  /**
   * Determines the allowed tables for a given exam based on the current curriculum.
   * @param {Object} exam - The exam object.
   * @returns {Array<string>} List of allowed table names.
   */
  getAllowedTables(exam) {
    const raw = exam.rawTable || "";
    const parts = raw.split("|").map((s) => s.trim());

    if (this.curriculum === "FBA") {
      return parts.filter((p) => ["1", "2"].includes(p));
    } else {
      const allowed = parts.filter((p) => ["A", "B", "C"].includes(p));
      const priority = { A: 1, B: 2, C: 3 };
      return allowed.sort((a, b) => priority[a] - priority[b]);
    }
  }

  /**
   * Checks if an exam is available in the current academic year.
   * @param {Object} exam - The exam object.
   * @returns {boolean} True if the exam is available, false otherwise.
   */
  isExamAvailable(exam) {
    const avail = exam.availability;
    if (!avail || avail.toLowerCase() === "enabled") return true;
    if (avail.toLowerCase() === "disabled") return false;

    if (avail.startsWith("From ")) {
      const fromYear = avail.replace("From ", "").trim();
      const currentStart = parseInt(this.year.split("/")[0]);
      const fromStart = parseInt(fromYear.split("/")[0]);
      return currentStart >= fromStart;
    }

    if (avail.includes("Biennial")) {
      const currentStart = parseInt(this.year.split("/")[0]);
      const isEvenYear = currentStart % 2 === 0;
      if (avail.includes("Even")) return isEvenYear;
      if (avail.includes("Odd")) return !isEvenYear;
    }
    return true;
  }

  /**
   * Gets information about the next availability of an exam.
   * @param {Object} exam - The exam object.
   * @returns {string|null} Localized availability info or null if available.
   */
  getNextAvailabilityInfo(exam) {
    const avail = exam.availability;
    if (!avail || avail.toLowerCase() === "enabled") return null;

    if (avail.startsWith("From "))
      return this.t("available_from", { date: avail.replace("From ", "") });

    if (avail.includes("Biennial")) {
      const currentStart = parseInt(this.year.split("/")[0]);
      const isEvenYear = currentStart % 2 === 0;
      if (avail.includes("Even") && !isEvenYear)
        return this.t("next_activation_even");
      if (avail.includes("Odd") && isEvenYear)
        return this.t("next_activation_odd");
    }
    return avail;
  }

  /**
   * Adds an exam to the plan.
   * @param {Object} exam - The exam to add.
   * @param {string|null} targetTable - Specific table to add the exam to (optional).
   * @returns {boolean} True if added successfully, false if already in plan.
   */
  addExam(exam, targetTable = null) {
    if (this.plan.some((p) => p.examId === exam.id)) return false;

    let table = targetTable;
    if (!table) {
      const allowed = this.getAllowedTables(exam);
      table = allowed.length > 0 ? allowed[0] : "Facoltativi";
    }

    this.plan.push({
      id: exam.id,
      examId: exam.id,
      name: exam.name,
      cfu: exam.cfu,
      table: table,
      isCustom: false,
    });
    this.rebalanceBuckets();
    return true;
  }

  /**
   * Adds a custom (external) exam to the plan.
   * @param {string} name - Name of the custom exam.
   * @param {number|string} cfu - Number of credits.
   * @param {string} table - Table to assign (defaults to "Facoltativi").
   */
  addCustomExam(name, cfu, table = "Facoltativi") {
    this.plan.push({
      id: "custom-" + Date.now(),
      examId: null,
      name: name,
      cfu: parseInt(cfu),
      table: table,
      isCustom: true,
    });
    this.rebalanceBuckets();
  }

  /**
   * Removes an exam from the plan by its plan item ID.
   * Mandatory exams cannot be removed.
   * @param {string} planItemId - The ID of the plan item to remove.
   */
  removeExam(planItemId) {
    const item = this.plan.find((p) => p.id === planItemId);
    if (item && item.table === "Obbligatori") return;

    this.plan = this.plan.filter((p) => p.id !== planItemId);
    this.rebalanceBuckets();
  }

  /**
   * Moves a plan item to a different table.
   * @param {string} planItemId - The ID of the plan item.
   * @param {string} newTable - The target table.
   * @returns {boolean} True if moved, false if move is not allowed.
   */
  moveExam(planItemId, newTable) {
    const item = this.plan.find((p) => p.id === planItemId);
    if (
      item &&
      !item.isCustom &&
      newTable !== "Facoltativi" &&
      newTable !== "Obbligatori" &&
      newTable !== "Fuori Piano"
    ) {
      const exam = this.allExams.find((e) => e.id === item.examId);
      const allowed = this.getAllowedTables(exam);
      if (!allowed.includes(newTable)) return false;
    }
    if (item) item.table = newTable;
    this.rebalanceBuckets();
    return true;
  }

  /**
   * Rebalances the exams across tables based on rules and limits.
   * Automatically moves exams between tables to satisfy requirements.
   */
  rebalanceBuckets() {
    const common = this.rules.degree_requirements.common_rules;
    const progRules =
      this.rules.degree_requirements.programs[this.curriculum].curriculum_rules;

    // 1. Map limits and identify sum rules (e.g., BC)
    const limits = {};
    let minSumBC = 0;
    progRules.forEach((r) => {
      if (r.source === "BC") minSumBC = r.min_sumBC_credits;
      else limits[r.source] = r.min_credits;
    });
    const freeLimit = common.free_exams_credits;

    const newPlan = [];
    const mandatoryItems = this.plan.filter((p) => p.table === "Obbligatori");
    newPlan.push(...mandatoryItems);

    const activeExams = this.plan.filter((p) => p.table !== "Obbligatori");

    activeExams.forEach((item) => {
      const exam = this.allExams.find((e) => e.id === item.examId);
      const allowed = item.isCustom ? [] : this.getAllowedTables(exam);
      let assigned = false;

      // --- ATTEMPT 1: Curriculum tables (A, B, C...) ---
      for (const t of allowed) {
        const currentInT = newPlan
          .filter((p) => p.table === t)
          .reduce((s, p) => s + p.cfu, 0);
        const currentBCSum = newPlan
          .filter((p) => p.table === "B" || p.table === "C")
          .reduce((s, p) => s + p.cfu, 0);

        // RESTRICTIVE CONDITION:
        // Enter table if individual min is not reached...
        const underIndividualMin = currentInT < (limits[t] || 0);

        // ...OR if it's a B/C exception to reach total 48 CFU
        const isBCException =
          (t === "B" || t === "C") && currentBCSum < minSumBC;

        if (underIndividualMin || isBCException) {
          item.table = t;
          assigned = true;
          break;
        }
      }

      // --- ATTEMPT 2: Optional (exactly 12 CFU) ---
      if (!assigned) {
        const currentInFac = newPlan
          .filter((p) => p.table === "Facoltativi")
          .reduce((s, p) => s + p.cfu, 0);
        if (currentInFac < freeLimit) {
          item.table = "Facoltativi";
          assigned = true;
        }
      }

      // --- ATTEMPT 3: Out of Plan ---
      // If not used to fill minimums or B+C rule, it goes out of plan
      if (!assigned) {
        item.table = "Fuori Piano";
      }

      newPlan.push(item);
    });

    this.plan = newPlan;
  }

  /**
   * Validates the current plan against the rules.
   * @returns {Object} Validation report containing totals, table status, and error messages.
   */
  validate() {
    const common = this.rules.degree_requirements.common_rules;
    const report = {
      totalCredits: 0,
      tables: {},
      specialRules: [],
      isValid: true,
      messages: [],
    };
    const schema =
      this.curriculum === "FBA"
        ? ["Obbligatori", "1", "2", "Facoltativi", "Fuori Piano"]
        : ["Obbligatori", "A", "B", "C", "Facoltativi", "Fuori Piano"];

    schema.forEach((t) => (report.tables[t] = { current: 0, min: 0 }));

    this.plan.forEach((item) => {
      if (item.table !== "Fuori Piano") report.totalCredits += item.cfu;
      report.tables[item.table].current += item.cfu;
    });

    // Standard Validation (Mandatory and Optional)
    report.tables["Obbligatori"].min = common.mandatory_exams.reduce(
      (s, e) => s + e.credits,
      0,
    );
    report.tables["Facoltativi"].min = common.free_exams_credits;

    // Load rules from JSON
    const progRules =
      this.rules.degree_requirements.programs[this.curriculum].curriculum_rules;
    progRules.forEach((rule) => {
      if (rule.source === "BC") {
        const currentBC =
          report.tables["B"].current + report.tables["C"].current;
        report.specialRules.push({
          label: this.t("sum_bc_label"),
          current: currentBC,
          min: rule.min_sumBC_credits,
        });
        if (currentBC < rule.min_sumBC_credits) {
          report.isValid = false;
          report.messages.push(
            this.t("sum_bc_missing", {
              missing: rule.min_sumBC_credits - currentBC,
            }),
          );
        }
      } else {
        const t = rule.source;
        if (report.tables[t]) {
          report.tables[t].min = rule.min_credits;
          if (report.tables[t].current < rule.min_credits) {
            report.isValid = false;
            report.messages.push(
              this.t("table_missing_cfu", {
                table: t,
                missing: rule.min_credits - report.tables[t].current,
              }),
            );
          }
        }
      }
    });

    // Basic messages validation
    if (
      report.tables["Obbligatori"].current < report.tables["Obbligatori"].min
    ) {
      report.isValid = false;
      report.messages.push(this.t("mandatory_incomplete"));
    }
    if (report.totalCredits < common.total_credits) {
      report.isValid = false;
      report.messages.push(
        this.t("total_cfu_status", {
          current: report.totalCredits,
          min: common.total_credits,
        }),
      );
    }

    return report;
  }

  /**
   * Resets the plan to its default state.
   */
  reset() {
    this.plan = [];
    this.initDefaults();
  }

  /**
   * Initializes the plan with mandatory exams.
   */
  initDefaults() {
    const mandatory =
      this.rules.degree_requirements.common_rules.mandatory_exams;
    mandatory.forEach((ex) => {
      this.plan.push({
        id: ex.name.toLowerCase().replace(/\s+/g, "-"),
        examId: null,
        name: ex.name,
        cfu: ex.credits,
        table: "Obbligatori",
        isCustom: true,
      });
    });
    this.rebalanceBuckets();
  }
}
