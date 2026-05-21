/**
 * Bootstrap the application by verifying authentication and wiring the auto-save listeners.
 * This file is loaded once when the frontend starts.
 */
startApplicatie();

// Auto-save: capture any input or change inside the dagstaat section
const dagstaat = document.getElementById('sectie-dagstaat');
if (dagstaat) {
    dagstaat.addEventListener('input', scheduleAutoSave);
    dagstaat.addEventListener('change', scheduleAutoSave);
}
