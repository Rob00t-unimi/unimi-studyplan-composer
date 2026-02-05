import { loadData } from "./data.js";
import { PlanManager } from "./logic.js";
import { t, currentLang, toggleLang } from "./i18n.js";

const { createApp, ref, computed, reactive, onMounted, watch } = Vue;

createApp({
  /**
   * Sets up the Vue application logic.
   * Initializes state, loads data, and defines action handlers.
   */
  setup() {
    const loading = ref(true);
    const initialized = ref(false);
    const data = ref({ exams: [], rules: null });
    const pm = ref(null); // PlanManager instance

    // Re-validate when language changes so messages update
    watch(currentLang, () => {
      refreshState();
    });

    const currentYear = new Date().getFullYear();
    const academicYearDefault = `${currentYear - 1}/${currentYear}`;

    const state = reactive({
      year: academicYearDefault,
      curriculum: "FBA",
      plan: [],
      validation: {},
      newExamName: "",
      newExamCFU: 6,
      searchQuery: "",
    });

    /**
     * Computed property for pillars list derived from loaded exams.
     */
    const pillars = computed(() => {
      if (!data.value.exams) return [];
      const p = new Set(
        data.value.exams.map((e) => e.pillar || "Other").filter((p) => p),
      );
      return Array.from(p).sort();
    });

    /**
     * Computed property for the exam matrix, grouped by pillar, subpillar, and period.
     * Filters exams based on the search query.
     */
    const matrix = computed(() => {
      if (!data.value.exams) return [];

      const pMap = {};
      const query = state.searchQuery.toLowerCase().trim();

      // Filter exams before grouping
      const filteredExams = data.value.exams.filter((e) => {
        return e.name.toLowerCase().includes(query);
      });

      filteredExams.forEach((e) => {
        const pName = e.pillar || "Other";
        const sName = e.subpillar || "General";

        if (!pMap[pName]) pMap[pName] = {};
        if (!pMap[pName][sName]) pMap[pName][sName] = { 1: [], 2: [], 3: [] };

        pMap[pName][sName][e.period].push(e);
      });

      return Object.keys(pMap)
        .sort()
        .map((pName) => ({
          name: pName,
          subpillars: Object.keys(pMap[pName])
            .sort()
            .map((sName) => ({
              name: sName,
              periods: [1, 2, 3].map((pId) => ({
                id: pId,
                exams: pMap[pName][sName][pId].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              })),
            })),
        }));
    });

    /**
     * Computed property for the table headers based on curriculum.
     */
    const sortedTables = computed(() => {
      if (state.curriculum === "FBA") {
        return ["Obbligatori", "1", "2", "Facoltativi", "Fuori Piano"];
      }
      return ["Obbligatori", "A", "B", "C", "Facoltativi", "Fuori Piano"];
    });

    /**
     * Computed property for grouping plan items by table.
     */
    const groupedPlan = computed(() => {
      const groups = {};
      sortedTables.value.forEach((t) => (groups[t] = []));

      state.plan.forEach((item) => {
        if (!groups[item.table]) groups[item.table] = [];
        groups[item.table].push(item);
      });
      return groups;
    });

    /**
     * Computed property for generating a list of academic years.
     */
    const academicYears = computed(() => {
      const years = [];
      const startYear = 2014;
      const endYear = new Date().getFullYear(); // Future horizon for planning

      for (let i = startYear; i <= endYear; i++) {
        const nextYear = (i + 1).toString();
        years.push(`${i}/${nextYear}`);
      }
      return years.reverse();
    });

    // Initialize
    onMounted(async () => {
      const loaded = await loadData();
      data.value = loaded;

      // Restore from LS or defaults
      const savedState = localStorage.getItem("studyPlanState");
      pm.value = new PlanManager(loaded.exams, loaded.rules, t);

      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          pm.value.setYear(parsed.year);
          pm.value.setCurriculum(parsed.curriculum);
          pm.value.plan = parsed.plan; // Restore plan items

          // Update reactive state
          state.year = parsed.year;
          state.curriculum = parsed.curriculum;

          initialized.value = true;
        } catch (e) {
          console.error("Failed to restore state", e);
          pm.value.initDefaults();
        }
      } else {
        pm.value.initDefaults();
      }

      refreshState();
      loading.value = false;
    });

    /**
     * Syncs the local reactive state with the PlanManager instance.
     */
    function refreshState() {
      if (!pm.value) return;
      state.plan = [...pm.value.plan];
      state.validation = pm.value.validate();
      // Save
      saveState();
    }

    /**
     * Persists the current state to Local Storage.
     */
    function saveState() {
      const toSave = {
        year: state.year,
        curriculum: state.curriculum,
        plan: state.plan,
      };
      localStorage.setItem("studyPlanState", JSON.stringify(toSave));
    }

    /**
     * Sets the academic year and updates the plan manager.
     * @param {string} y - The academic year string.
     */
    function setYear(y) {
      state.year = y;
      pm.value.setYear(y);
      refreshState();
    }

    /**
     * Sets the curriculum and updates the plan manager.
     * @param {string} c - The curriculum code.
     */
    function setCurriculum(c) {
      state.curriculum = c;
      pm.value.setCurriculum(c);
      refreshState();
    }

    /**
     * Initializes the planning phase by setting year and curriculum.
     */
    function startPlan() {
      setYear(state.year);
      setCurriculum(state.curriculum);
      initialized.value = true;
    }

    // Actions
    /**
     * Toggles an exam's presence in the plan.
     * @param {Object} exam - The exam object to toggle.
     */
    function toggleExam(exam) {
      const inPlan = state.plan.find((p) => p.examId === exam.id);
      if (inPlan) {
        pm.value.removeExam(inPlan.id);
      } else {
        pm.value.addExam(exam);
      }
      refreshState();
    }

    /**
     * Removes an item from the plan.
     * @param {string} id - The plan item ID.
     */
    function removePlanItem(id) {
      pm.value.removeExam(id);
      refreshState();
    }

    /**
     * Moves a plan item to a target table.
     * @param {string} id - The plan item ID.
     * @param {string} targetTable - The destination table name.
     */
    function movePlanItem(id, targetTable) {
      pm.value.moveExam(id, targetTable);
      refreshState();
    }

    /**
     * Adds a custom external exam to the plan.
     * Uses state values for name and CFU.
     */
    function addCustom() {
      if (!state.newExamName || !state.newExamCFU) return;
      pm.value.addCustomExam(state.newExamName, state.newExamCFU);

      // Reset fields after adding
      state.newExamName = "";
      state.newExamCFU = 6;

      refreshState();
    }

    // Helpers
    /**
     * Checks if an exam is available.
     * @param {Object} exam - The exam object.
     * @returns {boolean} True if available.
     */
    function isAvailable(exam) {
      if (!pm.value) return false;
      return pm.value.isExamAvailable(exam);
    }

    /**
     * Gets possible tables for a plan item based on curriculum rules.
     * @param {Object} planItem - The plan item.
     * @returns {Array<string>} List of allowed table names.
     */
    function getPossibleTables(planItem) {
      if (!pm.value || planItem.isCustom) return [];
      const exam = data.value.exams.find((e) => e.id === planItem.examId);
      if (!exam) return [];
      return pm.value.getAllowedTables(exam);
    }

    /**
     * Checks if an exam is currently in the plan.
     * @param {string} examId - The exam ID.
     * @returns {boolean} True if in plan.
     */
    function isInPlan(examId) {
      return state.plan.some((p) => p.examId === examId);
    }

    /**
     * Determines the CSS class for an exam card status.
     * @param {Object} exam - The exam object.
     * @returns {string} CSS class name ('selected', 'disabled', or empty).
     */
    function getExamStatusClass(exam) {
      if (isInPlan(exam.id)) return "selected";
      if (!isAvailable(exam)) return "disabled";
      return "";
    }

    /**
     * Gets the color associated with a pillar.
     * @param {string} pillar - The pillar name.
     * @returns {string} Hex color code.
     */
    function getPillarColor(pillar) {
      const colors = {
        "INTERACTION AND MULTIMEDIA": "#f472b6", // pink-400
        "ARTIFICIAL INTELLIGENCE, DATA ANALYTICS AND BIG DATA": "#60a5fa", // blue-400
        "ALGORITHMS, SOFTWARE AND THEORY": "#a78bfa", // violet-400
        "COMPUTING SYSTEMS IN INDUSTRY, BUSINESS AND MEDICINE": "#34d399", // emerald-400
        Other: "#9ca3af",
      };
      return colors[pillar] || "#cbd5e1";
    }

    /**
     * Returns style object for pillar border color.
     * @param {string} pillar - The pillar name.
     * @returns {Object} Style object.
     */
    function getPillarStyle(pillar) {
      return { borderLeftColor: getPillarColor(pillar) };
    }

    /**
     * Gets localized text for the next availability of an exam.
     * @param {Object} exam - The exam object or plan item.
     * @returns {string} Availability info string.
     */
    function getNextAvailability(exam) {
      if (!pm.value) return "";
      // If passing a plan object (which has examId), search for the original exam
      const target = exam.examId
        ? data.value.exams.find((e) => e.id === exam.examId)
        : exam;
      return pm.value.getNextAvailabilityInfo(target);
    }

    /**
     * Formats the list of tables an exam belongs to for display.
     * @param {Object} exam - The exam object.
     * @returns {string} Formatted string of tables.
     */
    function getDisplayTables(exam) {
      if (!exam.rawTable) return t("Facoltativi");

      const currentCurriculum = state.curriculum;
      const allTables = exam.rawTable.split("|").map((t) => t.trim());

      if (currentCurriculum === "F94") {
        // Filter only A, B, C
        const f94Tables = allTables.filter((t) => ["A", "B", "C"].includes(t));
        return f94Tables.length > 0 ? f94Tables.join(" | ") : t("Facoltativi");
      } else {
        // Filter only 1, 2
        const fbaTables = allTables.filter((t) => ["1", "2"].includes(t));
        return fbaTables.length > 0 ? fbaTables.join(" | ") : t("Facoltativi");
      }
    }

    /**
     * Resets the entire plan after user confirmation.
     */
    function resetPlan() {
      if (confirm(t("reset_confirm"))) {
        pm.value.reset();
        refreshState();
      }
    }

    /**
     * Generates and triggers a download of the current plan as a CSV file.
     */
    function downloadCSV() {
      function getType(item) {
        if (item.isCustom && item.table === "Obbligatori") return t("csv_mandatory");
        if (item.isCustom) return t("csv_extra");
        return t("csv_curricolar");
      }

      const exportData = state.plan.map((item) => {
        const originalExam = data.value.exams.find((e) => e.id === item.examId);
        return {
          Exam: item.name,
          CFU: item.cfu,
          "4 month period": originalExam ? originalExam.period : "N/D",
          Table: item.table,
          Pillar: originalExam ? originalExam.pillar : "N/D",
          SubPillar: originalExam ? originalExam.subpillar : "N/D",
          Type: getType(item),
          Link: originalExam ? originalExam.link : "",
        };
      });

      // Use PapaParse (already included in the project)
      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      const filename = `piano_studi_${state.curriculum}_${state.year.replace("/", "-")}.csv`;
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return {
      loading,
      initialized,
      state,
      pillars,
      matrix,
      sortedTables,
      groupedPlan,
      setYear,
      setCurriculum,
      startPlan,
      toggleExam,
      removePlanItem,
      movePlanItem,
      addCustom,
      isAvailable,
      getPossibleTables,
      isInPlan,
      getExamStatusClass,
      getPillarColor,
      getPillarStyle,
      getNextAvailability,
      getDisplayTables,
      academicYears,
      resetPlan,
      downloadCSV,
      t,
      currentLang,
      toggleLang,
    };
  },
}).mount("#app");
