startApplicatie();

// Auto-save: capture any input or change inside the dagstaat section
const dagstaat = document.getElementById('sectie-dagstaat');
if (dagstaat) {
    dagstaat.addEventListener('input',  scheduleAutoSave);
    dagstaat.addEventListener('change', scheduleAutoSave);
}
