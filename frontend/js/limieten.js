async function laadLimietenVanServer() {
        try {
            const response = await apiCall('/api/limieten');
            const limieten = await response.json();
            actieveLimieten = normaliseerLimieten(limieten);
            bouwLimietenBeheerTabel();
        } catch (fout) { console.error("Kon limieten niet laden", fout); }
    }

function normaliseerLimieten(limieten) {
        const genormaliseerd = { ...limieten };
        if (!genormaliseerd.watertemperatuur && genormaliseerd.temperatuur) {
            genormaliseerd.watertemperatuur = genormaliseerd.temperatuur;
        }
        if (genormaliseerd.flow) {
            if (!genormaliseerd.flow_diep) genormaliseerd.flow_diep = genormaliseerd.flow;
            if (!genormaliseerd.flow_ondiep) genormaliseerd.flow_ondiep = genormaliseerd.flow;
            if (!genormaliseerd.flow_peuterbad) genormaliseerd.flow_peuterbad = genormaliseerd.flow;
        }
        if (genormaliseerd.filter_druk) {
            if (!genormaliseerd.filter_druk_in) genormaliseerd.filter_druk_in = genormaliseerd.filter_druk;
            if (!genormaliseerd.filter_druk_uit) genormaliseerd.filter_druk_uit = genormaliseerd.filter_druk;
            if (!genormaliseerd.filter_druk_peuterbad) genormaliseerd.filter_druk_peuterbad = genormaliseerd.filter_druk;
        }
        delete genormaliseerd.temperatuur;
        delete genormaliseerd.flow;
        delete genormaliseerd.filter_druk;
        return genormaliseerd;
    }

function bouwLimietenBeheerTabel() {
        const tbody = document.getElementById('limietenTbody');
        tbody.innerHTML = '';
        const labels = { ph_waarde: 'pH Waarde', chloor_waarde: 'Chloor (mg/l)', flow_diep: 'Flow Diep (m³/h)', flow_ondiep: 'Flow Ondiep (m³/h)', flow_peuterbad: 'Flow Peuterbad (m³/h)', filter_druk_in: 'Filterdruk In (bar)', filter_druk_uit: 'Filterdruk Uit (bar)', filter_druk_peuterbad: 'Filterdruk Peuterbad (bar)', watertemperatuur: 'Watertemperatuur (°C)', elektriciteit_nacht: 'Elektriciteit Nacht', elektriciteit_dag: 'Elektriciteit Dag', gas: 'Gas' };
        Object.keys(actieveLimieten).forEach(param => {
            tbody.innerHTML += `<tr id="limiet-rij-${param}" data-param="${param}">
                <td><b>${labels[param] || param}</b></td>
                <td><input type="number" class="l-min" step="0.01" value="${actieveLimieten[param].min}"></td>
                <td><input type="number" class="l-max" step="0.01" value="${actieveLimieten[param].max}"></td></tr>`;
        });
    }

async function verwerkCentraleLimietenOpslaan() {
        toonBericht('Limieten verwerken...', '');
        const rijen = document.querySelectorAll('#limietenTbody tr');
        let succesTeller = 0;
        for (const rij of rijen) {
            const paramNaam = rij.getAttribute('data-param');
            const payload = { parameter_naam: paramNaam, min_waarde: parseFloat(rij.querySelector('.l-min').value), max_waarde: parseFloat(rij.querySelector('.l-max').value) };
            try {
                const response = await apiCall('/api/limieten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (response.ok) { succesTeller++; }
            } catch (f) { console.error(f); }
        }
        if (succesTeller === rijen.length) { toonBericht('Limieten succesvol bijgewerkt!', 'succes'); laadLimietenVanServer(); }
        else { toonBericht('Fout bij opslaan.', 'fout'); }
    }
