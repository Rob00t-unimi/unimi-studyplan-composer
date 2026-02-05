const { ref } = Vue;

/**
 * Reactive reference for the current language.
 * @type {import('vue').Ref<string>}
 */
export const currentLang = ref('it');

/**
 * Dictionary of localized messages.
 * Contains translations for Italian ('it') and English ('en').
 * @type {Object}
 */
export const messages = {
    it: {
        attention: "Attenzione",
        disclaimer: "Le disponibilità degli esami potrebbero essere inesatte. È  consigliato ricontrollare gli esami e le regole ufficiali sul",
        ateneo_website: "sito web di Ateneo",
        disclaimer_suffix: "Questo tool è un supporto alla semplificazione e non sostituisce gli strumenti ufficiali.",
        
        loading: "Caricamento dati...",
        configure_plan: "Configura il tuo Piano",
        select_year_curriculum: "Seleziona l'anno di riferimento e il tuo ordinamento.",
        current_academic_year: "Anno Accademico corrente",
        curriculum: "Ordinamento",
        fba_description: "FBA (Immatricolati dal 2025/26)",
        f94_description: "F94 (Immatricolati dal 2014/15 al 2024/25)",
        start_composition: "Inizia la composizione",
        
        your_plan: "Il tuo Piano",
        total_cfu_official: "CFU Totali",
        table: "Tabella",
        move_to: "Sposta in",
        add_external_exam: "Aggiungi esame esterno",
        exam_name_placeholder: "Nome esame...",
        ok: "OK",
        no_exam_selected: "Nessun esame selezionato.",
        
        main_title: "Informatica Magistrale",
        search_placeholder: "Cerca esame per nome...",
        download_csv: "Scarica CSV",
        reset_title: "Resetta tutto",
        reset: "Reset",
        configure: "Configura",
        pillar_header: "Subpillar",
        q1: "Quadrimestre 1",
        q2: "Quadrimestre 2",
        q3: "Quadrimestre 3",
        
        footer_repo: "Repo",
        footer_portfolio: "Portfolio",
        
        Obbligatori: "Obbligatori",
        Facoltativi: "Facoltativi",
        "Fuori Piano": "Fuori Piano",
        "1": "1",
        "2": "2",
        "A": "A",
        "B": "B",
        "C": "C",
        
        mandatory_incomplete: "Obbligatori: Piano incompleto",
        total_cfu_status: "Totale: {current}/{min} CFU",
        table_missing_cfu: "Tabella {table}: Mancano {missing} CFU",
        sum_bc_label: "Somma Tabelle B + C",
        sum_bc_missing: "Somma delle tabelle B e C insufficiente: mancano {missing} CFU",
        
        available_from: "Disponibile dal {date}",
        next_activation_even: "Prossima attivazione: Anni Pari (es. 2026/27)",
        next_activation_odd: "Prossima attivazione: Anni Dispari (es. 2027/28)",
        
        reset_confirm: "Sei sicuro di voler resettare il piano? Perderai tutte le selezioni effettuate.",
        facoltativo_label: "Facoltativo",
        
        csv_mandatory: "Mandatory",
        csv_extra: "Extra",
        csv_curricolar: "Curricolar"
    },
    en: {
        attention: "Warning",
        disclaimer: "Exam availability might be inaccurate. It is always good practice to double-check official exams and rules on the",
        ateneo_website: "University website",
        disclaimer_suffix: "This tool is a support for simplification and does not replace official tools.",
        
        loading: "Loading data...",
        configure_plan: "Configure your Plan",
        select_year_curriculum: "Select the reference year and your curriculum.",
        current_academic_year: "Current Academic Year",
        curriculum: "Curriculum",
        fba_description: "FBA (Enrolled from 2025/26)",
        f94_description: "F94 (Enrolled from 2014/15 to 2024/25)",
        start_composition: "Start composition",
        
        your_plan: "Your Plan",
        total_cfu_official: "Total CFU",
        table: "Table",
        move_to: "Move to",
        add_external_exam: "Add external exam",
        exam_name_placeholder: "Exam name...",
        ok: "OK",
        no_exam_selected: "No exam selected.",
        
        main_title: "Master's Degree in Computer Science",
        search_placeholder: "Search exam by name...",
        download_csv: "Download CSV",
        reset_title: "Reset all",
        reset: "Reset",
        configure: "Configure",
        pillar_header: "Subpillar",
        q1: "Term 1",
        q2: "Term 2",
        q3: "Term 3",
        
        footer_repo: "Repo",
        footer_portfolio: "Portfolio",
        
        Obbligatori: "Mandatory",
        Facoltativi: "Optional",
        "Fuori Piano": "Out of Plan",
        "1": "1",
        "2": "2",
        "A": "A",
        "B": "B",
        "C": "C",

        mandatory_incomplete: "Mandatory: Plan incomplete",
        total_cfu_status: "Total: {current}/{min} CFU",
        table_missing_cfu: "Table {table}: Missing {missing} CFU",
        sum_bc_label: "Sum Tables B + C",
        sum_bc_missing: "Sum of tables B and C insufficient: missing {missing} CFU",
        
        available_from: "Available from {date}",
        next_activation_even: "Next activation: Even Years (e.g. 2026/27)",
        next_activation_odd: "Next activation: Odd Years (e.g. 2027/28)",
        
        reset_confirm: "Are you sure you want to reset the plan? You will lose all selections made.",
        facoltativo_label: "Optional",
        
        csv_mandatory: "Mandatory",
        csv_extra: "Extra",
        csv_curricolar: "Curricolar"
    }
};

/**
 * Translates a key into the current language.
 * @param {string} key - The key to translate.
 * @param {Object} [params={}] - Parameters to interpolate into the translation string (e.g., {name: 'Val'}).
 * @returns {string} The translated string or the key if not found.
 */
export function t(key, params = {}) {
    let text = messages[currentLang.value][key];
    if (text === undefined) return key;
    
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

/**
 * Toggles the current language between Italian ('it') and English ('en').
 */
export function toggleLang() {
    currentLang.value = currentLang.value === 'it' ? 'en' : 'it';
}
