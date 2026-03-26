// === Supabase-koppling ===
const SUPABASE_URL = 'https://fiijkoaqqhhwzmfymrjb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaWprb2FxcWhod3ptZnltcmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTMwNjUsImV4cCI6MjA5MDA4OTA2NX0.sxzzXxcHJOkpxL4ONFvJ_ih2hYHRspiP1pkDlTjziQA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let leads = [];

// === Inloggning ===
const loginPage = document.getElementById('loginPage');
const appPage = document.getElementById('appPage');
const loginBtn = document.getElementById('loginBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
}

function hideError() {
    loginError.classList.add('hidden');
}

function showApp() {
    loginPage.classList.add('hidden');
    appPage.classList.remove('hidden');
    loadLeads();
}

function showLogin() {
    loginPage.classList.remove('hidden');
    appPage.classList.add('hidden');
}

// Kolla om redan inloggad
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        showApp();
    }
});

// Logga in eller skapa konto
let isSignup = false;

document.getElementById('signupLink').addEventListener('click', (e) => {
    e.preventDefault();
    isSignup = true;
    loginBtn.textContent = 'Skapa konto';
    document.getElementById('signupHint').innerHTML = 'Har du redan konto? <a href="#" id="backToLogin">Logga in</a>';
    document.getElementById('backToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        isSignup = false;
        loginBtn.textContent = 'Logga in';
        document.getElementById('signupHint').innerHTML = 'Inget konto? <a href="#" id="signupLink2">Skapa konto</a>';
        document.getElementById('signupLink2').addEventListener('click', (ev) => {
            ev.preventDefault();
            isSignup = true;
            loginBtn.textContent = 'Skapa konto';
        });
        hideError();
    });
    hideError();
});

loginBtn.addEventListener('click', async () => {
    hideError();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showError('Fyll i både e-post och lösenord.');
        return;
    }

    if (isSignup) {
        if (password.length < 6) {
            showError('Lösenordet måste vara minst 6 tecken.');
            return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            showError(error.message);
            return;
        }
        showApp();
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showError('Fel e-post eller lösenord. Försök igen.');
            return;
        }
        showApp();
    }
});

loginPassword.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

loginEmail.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') loginPassword.focus();
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLogin();
});

// === Element ===
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const regionFilter = document.getElementById('regionFilter');
const sizeFilter = document.getElementById('sizeFilter');
const statusFilter = document.getElementById('statusFilter');
const addLeadBtn = document.getElementById('addLeadBtn');
const addLeadForm = document.getElementById('addLeadForm');
const saveLeadBtn = document.getElementById('saveLeadBtn');
const cancelLeadBtn = document.getElementById('cancelLeadBtn');
const leadsList = document.getElementById('leadsList');
const leadModal = document.getElementById('leadModal');
const closeModal = document.getElementById('closeModal');
const modalBody = document.getElementById('modalBody');

// === Hämta leads från Supabase ===
async function loadLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Fel vid hämtning:', error);
        return;
    }

    leads = data.map(row => ({
        id: row.id,
        company: row.company,
        industry: row.industry,
        region: row.region,
        size: row.size,
        contactName: row.contact_name,
        contactRole: row.contact_role,
        contactEmail: row.contact_email,
        contactLinkedin: row.contact_linkedin,
        signals: row.signals,
        notes: row.notes,
        status: row.status,
        created: row.created_at
    }));

    updateStats();
    renderLeads();
}

// === Statistik ===
function updateStats() {
    document.getElementById('totalLeads').textContent = leads.length;
    document.getElementById('newLeads').textContent = leads.filter(l => l.status === 'new').length;
    document.getElementById('contactedLeads').textContent = leads.filter(l => l.status === 'contacted').length;
    document.getElementById('meetingLeads').textContent = leads.filter(l => l.status === 'meeting').length;
}

// === Visa leads ===
function renderLeads() {
    const search = searchInput.value.toLowerCase();
    const region = regionFilter.value;
    const size = sizeFilter.value;
    const status = statusFilter.value;

    let filtered = leads.filter(lead => {
        if (search && !`${lead.company} ${lead.industry} ${lead.signals} ${lead.contactName} ${lead.contactRole}`.toLowerCase().includes(search)) return false;
        if (region && lead.region !== region) return false;
        if (size && lead.size !== size) return false;
        if (status && lead.status !== status) return false;
        return true;
    });

    if (filtered.length === 0) {
        leadsList.innerHTML = '<p class="empty-state">Inga leads ännu. Lägg till din första lead ovan!</p>';
        return;
    }

    const statusLabels = {
        new: 'Ny',
        contacted: 'Kontaktad',
        meeting: 'Möte bokat',
        proposal: 'Offert skickad',
        closed: 'Avslutad'
    };

    const regionLabels = {
        stockholm: 'Stockholm',
        goteborg: 'Göteborg',
        malmo: 'Malmö',
        ovriga: 'Övriga Sverige'
    };

    const sizeLabels = {
        small: 'Litet',
        medium: 'Medelstort',
        large: 'Stort'
    };

    leadsList.innerHTML = filtered.map(lead => `
        <div class="lead-card" data-id="${lead.id}">
            <div class="lead-info">
                <h3>${lead.company}</h3>
                <div class="lead-meta">
                    ${lead.industry ? `<span>${lead.industry}</span>` : ''}
                    <span>${regionLabels[lead.region] || ''}</span>
                    <span>${sizeLabels[lead.size] || ''}</span>
                    ${lead.contactName ? `<span>${lead.contactName}${lead.contactRole ? ' — ' + lead.contactRole : ''}</span>` : ''}
                </div>
            </div>
            <div class="lead-actions">
                <span class="status-badge status-${lead.status}">${statusLabels[lead.status]}</span>
                <button class="btn btn-ghost btn-small delete-btn" data-id="${lead.id}" title="Ta bort">&times;</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.lead-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            const lead = leads.find(l => l.id === card.dataset.id);
            if (lead) showLeadDetail(lead);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Vill du ta bort den här leaden?')) {
                await supabase.from('leads').delete().eq('id', id);
                await loadLeads();
            }
        });
    });
}

// === Visa lead-detalj i modal ===
function showLeadDetail(lead) {
    const statusLabels = {
        new: 'Ny',
        contacted: 'Kontaktad',
        meeting: 'Möte bokat',
        proposal: 'Offert skickad',
        closed: 'Avslutad'
    };

    const regionLabels = {
        stockholm: 'Stockholm',
        goteborg: 'Göteborg',
        malmo: 'Malmö',
        ovriga: 'Övriga Sverige'
    };

    const sizeLabels = {
        small: 'Litet (1-49)',
        medium: 'Medelstort (50-500)',
        large: 'Stort (500+)'
    };

    modalBody.innerHTML = `
        <div class="modal-detail">
            <h2>${lead.company}</h2>
            <div class="detail-grid">
                <span class="detail-label">Bransch</span>
                <span class="detail-value">${lead.industry || '—'}</span>
                <span class="detail-label">Region</span>
                <span class="detail-value">${regionLabels[lead.region] || '—'}</span>
                <span class="detail-label">Storlek</span>
                <span class="detail-value">${sizeLabels[lead.size] || '—'}</span>
                <span class="detail-label">Status</span>
                <span class="detail-value"><span class="status-badge status-${lead.status}">${statusLabels[lead.status]}</span></span>
            </div>

            ${lead.contactName ? `
            <div class="detail-section">
                <h3>Kontaktperson</h3>
                <div class="detail-grid">
                    <span class="detail-label">Namn</span>
                    <span class="detail-value">${lead.contactName}</span>
                    ${lead.contactRole ? `<span class="detail-label">Roll</span><span class="detail-value">${lead.contactRole}</span>` : ''}
                    ${lead.contactEmail ? `<span class="detail-label">E-post</span><span class="detail-value"><a href="mailto:${lead.contactEmail}">${lead.contactEmail}</a></span>` : ''}
                    ${lead.contactLinkedin ? `<span class="detail-label">LinkedIn</span><span class="detail-value"><a href="${lead.contactLinkedin}" target="_blank">Öppna profil</a></span>` : ''}
                </div>
            </div>` : ''}

            ${lead.signals ? `
            <div class="detail-section">
                <h3>AI-signaler</h3>
                <p>${lead.signals}</p>
            </div>` : ''}

            ${lead.notes ? `
            <div class="detail-section">
                <h3>Anteckningar</h3>
                <p>${lead.notes}</p>
            </div>` : ''}

            <div class="modal-actions">
                <label style="font-size: 0.9rem; font-weight: 500; color: #374151; margin-right: 0.5rem;">Ändra status:</label>
                <select id="modalStatusSelect" style="font-size: 0.9rem;">
                    <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Ny</option>
                    <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Kontaktad</option>
                    <option value="meeting" ${lead.status === 'meeting' ? 'selected' : ''}>Möte bokat</option>
                    <option value="proposal" ${lead.status === 'proposal' ? 'selected' : ''}>Offert skickad</option>
                    <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Avslutad</option>
                </select>
            </div>
        </div>
    `;

    document.getElementById('modalStatusSelect').addEventListener('change', async (e) => {
        await supabase.from('leads').update({ status: e.target.value }).eq('id', lead.id);
        await loadLeads();
    });

    leadModal.classList.remove('hidden');
}

// === Lägg till ny lead ===
addLeadBtn.addEventListener('click', () => {
    addLeadForm.classList.toggle('hidden');
});

cancelLeadBtn.addEventListener('click', () => {
    addLeadForm.classList.add('hidden');
    clearForm();
});

saveLeadBtn.addEventListener('click', async () => {
    const company = document.getElementById('companyName').value.trim();
    if (!company) {
        alert('Du måste ange ett företagsnamn.');
        return;
    }

    const newLead = {
        company: company,
        industry: document.getElementById('industry').value.trim(),
        region: document.getElementById('region').value,
        size: document.getElementById('companySize').value,
        contact_name: document.getElementById('contactName').value.trim(),
        contact_role: document.getElementById('contactRole').value.trim(),
        contact_email: document.getElementById('contactEmail').value.trim(),
        contact_linkedin: document.getElementById('contactLinkedin').value.trim(),
        signals: document.getElementById('signals').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        status: 'new'
    };

    const { error } = await supabase.from('leads').insert([newLead]);
    if (error) {
        alert('Något gick fel vid sparning. Försök igen.');
        console.error(error);
        return;
    }

    await loadLeads();
    clearForm();
    addLeadForm.classList.add('hidden');
});

function clearForm() {
    document.getElementById('companyName').value = '';
    document.getElementById('industry').value = '';
    document.getElementById('region').value = 'stockholm';
    document.getElementById('companySize').value = 'small';
    document.getElementById('contactName').value = '';
    document.getElementById('contactRole').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactLinkedin').value = '';
    document.getElementById('signals').value = '';
    document.getElementById('notes').value = '';
}

// === Stäng modal ===
closeModal.addEventListener('click', () => {
    leadModal.classList.add('hidden');
});

leadModal.addEventListener('click', (e) => {
    if (e.target === leadModal) {
        leadModal.classList.add('hidden');
    }
});

// === Sök och filter ===
searchBtn.addEventListener('click', renderLeads);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') renderLeads();
});
regionFilter.addEventListener('change', renderLeads);
sizeFilter.addEventListener('change', renderLeads);
statusFilter.addEventListener('change', renderLeads);
