/**
 * Clamp a date string to the configured season boundaries (stored as YYYYMMDD integers).
 */
function begrensSeizoenDatum(datumStr) {
    const begin = actieveLimieten.seizoen_begin?.max;
    const eind  = actieveLimieten.seizoen_eind?.max;
    if (!begin && !eind) return datumStr;
    // Convert YYYYMMDD integer to ISO string for direct string comparison
    const toIso = v => { const s = String(Math.round(v)).padStart(8,'0'); return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`; };
    if (begin && datumStr < toIso(begin)) return toIso(begin);
    if (eind  && datumStr > toIso(eind))  return toIso(eind);
    return datumStr;
}

/**
 * Clamp the centraleDatum input to the season boundaries.
 * Called after limieten are loaded or when the date is changed directly.
 */
function pasSeizoenAan() {
    const input = document.getElementById('centraleDatum');
    if (!input || !input.value) return;
    const begrensd = begrensSeizoenDatum(input.value);
    if (begrensd !== input.value) input.value = begrensd;
}

/**
 * Move the selected central date forwards or backwards by a number of days.
 * Clamps to the configured season boundaries.
 * @param {number} dagen - Positive or negative day offset to apply.
 */
function veranderDatum(dagen) {
        toonBericht('', '');
        const centraleInput = document.getElementById('centraleDatum');
        const actueleDatum = new Date(centraleInput.value);
        actueleDatum.setDate(actueleDatum.getDate() + dagen);
        let nieuw = `${actueleDatum.getFullYear()}-${String(actueleDatum.getMonth() + 1).padStart(2, '0')}-${String(actueleDatum.getDate()).padStart(2, '0')}`;
        nieuw = begrensSeizoenDatum(nieuw);
        centraleInput.value = nieuw;
        laadMetingen();
    }
