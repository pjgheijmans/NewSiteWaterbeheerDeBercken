/**
 * Move the selected central date forwards or backwards by a number of days.
 * @param {number} dagen - Positive or negative day offset to apply.
 */
function veranderDatum(dagen) {
        toonBericht('', '');
        const centraleInput = document.getElementById('centraleDatum');
        const actueleDatum = new Date(centraleInput.value);
        actueleDatum.setDate(actueleDatum.getDate() + dagen);
        centraleInput.value = `${actueleDatum.getFullYear()}-${String(actueleDatum.getMonth() + 1).padStart(2, '0')}-${String(actueleDatum.getDate()).padStart(2, '0')}`;
        laadMetingen();
    }
