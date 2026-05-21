async function startApplicatie() {
        try {
            const res = await apiCall('/api/ingelogd');
            const data = await res.json();
            if (data.ingelogd) { activeerDashboard(data.gebruiker); }
            else {
                document.getElementById('scherm-login').style.display = 'block';
                document.getElementById('scherm-dashboard').style.display = 'none';
            }
        } catch (f) { console.error("Starten mislukt", f); }
    }

async function verwerkLogin() {
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        document.getElementById('login-fout').innerText = '';

        try {
            const res = await apiCall('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (res.ok) { activeerDashboard(data.gebruiker); }
            else { document.getElementById('login-fout').innerText = data.error; }
        } catch (f) { document.getElementById('login-fout').innerText = 'Verbindingsfout.'; }
    }

function activeerDashboard(gebruiker) {
        ingelogdeGebruiker = gebruiker;
        document.getElementById('scherm-login').style.display = 'none';
        document.getElementById('scherm-dashboard').style.display = 'block';
        document.getElementById('welkom-tekst').innerText = `Ingelogd: ${gebruiker.voornaam} (${gebruiker.taak})`;

        if (gebruiker.taak === 'waterbeheerder') {
            document.getElementById('btn-rol-waterbeheer').style.display = 'inline-block';
            document.getElementById('btn-rol-coordinatoren').style.display = 'inline-block';
            document.getElementById('btn-rol-limieten').style.display = 'inline-block';
            document.getElementById('btn-rol-gebruikers').style.display = 'inline-block';
            document.getElementById('btn-rol-database').style.display = 'inline-block';
            document.getElementById('btn-rol-trendanalyse').style.display = 'inline-block';
            wisselRol('waterbeheer');
        } else if (gebruiker.taak === 'Administrator') {
            document.getElementById('btn-rol-waterbeheer').style.display = 'none';
            document.getElementById('btn-rol-coordinatoren').style.display = 'none';
            document.getElementById('btn-rol-limieten').style.display = 'inline-block';
            document.getElementById('btn-rol-gebruikers').style.display = 'inline-block';
            document.getElementById('btn-rol-database').style.display = 'inline-block';
            document.getElementById('btn-rol-trendanalyse').style.display = 'inline-block';
            wisselRol('limieten');
        } else {
            document.getElementById('btn-rol-waterbeheer').style.display = 'none';
            document.getElementById('btn-rol-coordinatoren').style.display = 'inline-block';
            document.getElementById('btn-rol-limieten').style.display = 'none';
            document.getElementById('btn-rol-gebruikers').style.display = 'none';
            document.getElementById('btn-rol-database').style.display = 'none';
            document.getElementById('btn-rol-trendanalyse').style.display = 'none';
            wisselRol('coordinatoren');
        }
    }

async function verwerkLogout() {
        await apiCall('/api/logout', { method: 'POST' });
        ingelogdeGebruiker = null;
        startApplicatie();
    }

function wisselRol(rol) {
        huidigeRol = rol;
        ['waterbeheer', 'coordinatoren', 'limieten', 'gebruikers', 'database', 'trendanalyse'].forEach(r => {
            const btn = document.getElementById(`btn-rol-${r}`);
            if (btn) btn.classList.toggle('actief', r === rol);
        });
        const isDagstaat = (rol === 'waterbeheer' || rol === 'coordinatoren');
        document.getElementById('sectie-dagstaat').style.display = isDagstaat ? 'block' : 'none';
        document.getElementById('sectie-limieten').style.display = (rol === 'limieten') ? 'block' : 'none';
        document.getElementById('sectie-gebruikers').style.display = (rol === 'gebruikers') ? 'block' : 'none';
        document.getElementById('sectie-database').style.display = (rol === 'database') ? 'block' : 'none';
        document.getElementById('sectie-trendanalyse').style.display = (rol === 'trendanalyse') ? 'block' : 'none';
        document.getElementById('waterbeheer-tabs').style.display = (rol === 'waterbeheer') ? 'flex' : 'none';
        if (isDagstaat) {
            laadLimietenVanServer().then(() => laadMetingen());
        } else if (rol === 'gebruikers') {
            laadGebruikers();
        } else if (rol === 'limieten') {
            laadLimietenVanServer();
        } else if (rol === 'trendanalyse') {
            initTrendDatums();
        }
    }
