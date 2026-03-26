// === Supabase-koppling ===
const SUPABASE_URL = 'https://fiijkoaqqhhwzmfymrjb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaWprb2FxcWhod3ptZnltcmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTMwNjUsImV4cCI6MjA5MDA4OTA2NX0.sxzzXxcHJOkpxL4ONFvJ_ih2hYHRspiP1pkDlTjziQA';

let sb;
try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    document.getElementById('loginError').textContent = 'Kunde inte ansluta till databasen: ' + e.message;
    document.getElementById('loginError').classList.remove('hidden');
}

let leads = [];

// ============================================
// INLOGGNING — körs direkt när sidan laddas
// ============================================
document.addEventListener('DOMContentLoaded', function () {

    var loginPage = document.getElementById('loginPage');
    var appPage = document.getElementById('appPage');
    var loginBtn = document.getElementById('loginBtn');
    var signupBtn = document.getElementById('signupBtn');
    var loginEmail = document.getElementById('loginEmail');
    var loginPassword = document.getElementById('loginPassword');
    var loginError = document.getElementById('loginError');
    var logoutBtn = document.getElementById('logoutBtn');

    function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }

    function hideError() {
        loginError.classList.add('hidden');
    }

    function showApp() {
        loginPage.style.display = 'none';
        appPage.style.display = 'block';
        loadLeads();
    }

    function showLogin() {
        loginPage.style.display = 'flex';
        appPage.style.display = 'none';
    }

    // Kolla om redan inloggad
    if (sb) {
        sb.auth.getSession().then(function (result) {
            if (result.data.session) {
                showApp();
            }
        });
    }

    // Logga in-knapp
    loginBtn.addEventListener('click', function () {
        hideError();
        var email = loginEmail.value.trim();
        var password = loginPassword.value;

        if (!email || !password) {
            showError('Fyll i både e-post och lösenord.');
            return;
        }

        sb.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
            if (result.error) {
                showError('Fel e-post eller lösenord. Försök igen.');
            } else {
                showApp();
            }
        });
    });

    // Skapa konto-knapp
    signupBtn.addEventListener('click', function () {
        hideError();
        var email = loginEmail.value.trim();
        var password = loginPassword.value;

        if (!email || !password) {
            showError('Fyll i både e-post och lösenord.');
            return;
        }

        if (password.length < 6) {
            showError('Lösenordet måste vara minst 6 tecken.');
            return;
        }

        sb.auth.signUp({ email: email, password: password }).then(function (result) {
            if (result.error) {
                showError('Kunde inte skapa konto: ' + result.error.message);
            } else {
                showApp();
            }
        });
    });

    // Enter-tangent
    loginPassword.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') loginBtn.click();
    });

    loginEmail.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') loginPassword.focus();
    });

    // Logga ut
    logoutBtn.addEventListener('click', function () {
        sb.auth.signOut().then(function () {
            showLogin();
        });
    });

    // ============================================
    // APPEN — leads-hantering
    // ============================================
    var searchInput = document.getElementById('searchInput');
    var searchBtn = document.getElementById('searchBtn');
    var regionFilter = document.getElementById('regionFilter');
    var sizeFilter = document.getElementById('sizeFilter');
    var statusFilter = document.getElementById('statusFilter');
    var addLeadBtn = document.getElementById('addLeadBtn');
    var addLeadForm = document.getElementById('addLeadForm');
    var saveLeadBtn = document.getElementById('saveLeadBtn');
    var cancelLeadBtn = document.getElementById('cancelLeadBtn');
    var leadsList = document.getElementById('leadsList');
    var leadModal = document.getElementById('leadModal');
    var closeModal = document.getElementById('closeModal');
    var modalBody = document.getElementById('modalBody');

    window.loadLeads = async function () {
        var result = await sb.from('leads').select('*').order('created_at', { ascending: false });

        if (result.error) {
            console.error('Fel vid hämtning:', result.error);
            return;
        }

        leads = result.data.map(function (row) {
            return {
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
            };
        });

        updateStats();
        renderLeads();
    };

    function updateStats() {
        document.getElementById('totalLeads').textContent = leads.length;
        document.getElementById('newLeads').textContent = leads.filter(function (l) { return l.status === 'new'; }).length;
        document.getElementById('contactedLeads').textContent = leads.filter(function (l) { return l.status === 'contacted'; }).length;
        document.getElementById('meetingLeads').textContent = leads.filter(function (l) { return l.status === 'meeting'; }).length;
    }

    function renderLeads() {
        var search = searchInput.value.toLowerCase();
        var region = regionFilter.value;
        var size = sizeFilter.value;
        var status = statusFilter.value;

        var filtered = leads.filter(function (lead) {
            if (search && !(lead.company + ' ' + lead.industry + ' ' + lead.signals + ' ' + lead.contactName + ' ' + lead.contactRole).toLowerCase().includes(search)) return false;
            if (region && lead.region !== region) return false;
            if (size && lead.size !== size) return false;
            if (status && lead.status !== status) return false;
            return true;
        });

        if (filtered.length === 0) {
            leadsList.innerHTML = '<p class="empty-state">Inga leads ännu. Lägg till din första lead ovan!</p>';
            return;
        }

        var statusLabels = { new: 'Ny', contacted: 'Kontaktad', meeting: 'Möte bokat', proposal: 'Offert skickad', closed: 'Avslutad' };
        var regionLabels = { stockholm: 'Stockholm', goteborg: 'Göteborg', malmo: 'Malmö', ovriga: 'Övriga Sverige' };
        var sizeLabels = { small: 'Litet', medium: 'Medelstort', large: 'Stort' };

        leadsList.innerHTML = filtered.map(function (lead) {
            return '<div class="lead-card" data-id="' + lead.id + '">' +
                '<div class="lead-info">' +
                '<h3>' + lead.company + '</h3>' +
                '<div class="lead-meta">' +
                (lead.industry ? '<span>' + lead.industry + '</span>' : '') +
                '<span>' + (regionLabels[lead.region] || '') + '</span>' +
                '<span>' + (sizeLabels[lead.size] || '') + '</span>' +
                (lead.contactName ? '<span>' + lead.contactName + (lead.contactRole ? ' — ' + lead.contactRole : '') + '</span>' : '') +
                '</div></div>' +
                '<div class="lead-actions">' +
                '<span class="status-badge status-' + lead.status + '">' + statusLabels[lead.status] + '</span>' +
                '<button class="btn btn-ghost btn-small delete-btn" data-id="' + lead.id + '" title="Ta bort">&times;</button>' +
                '</div></div>';
        }).join('');

        document.querySelectorAll('.lead-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('delete-btn')) return;
                var lead = leads.find(function (l) { return l.id === card.dataset.id; });
                if (lead) showLeadDetail(lead);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                if (confirm('Vill du ta bort den här leaden?')) {
                    await sb.from('leads').delete().eq('id', btn.dataset.id);
                    await loadLeads();
                }
            });
        });
    }

    function showLeadDetail(lead) {
        var statusLabels = { new: 'Ny', contacted: 'Kontaktad', meeting: 'Möte bokat', proposal: 'Offert skickad', closed: 'Avslutad' };
        var regionLabels = { stockholm: 'Stockholm', goteborg: 'Göteborg', malmo: 'Malmö', ovriga: 'Övriga Sverige' };
        var sizeLabels = { small: 'Litet (1-49)', medium: 'Medelstort (50-500)', large: 'Stort (500+)' };

        modalBody.innerHTML =
            '<div class="modal-detail">' +
            '<h2>' + lead.company + '</h2>' +
            '<div class="detail-grid">' +
            '<span class="detail-label">Bransch</span><span class="detail-value">' + (lead.industry || '—') + '</span>' +
            '<span class="detail-label">Region</span><span class="detail-value">' + (regionLabels[lead.region] || '—') + '</span>' +
            '<span class="detail-label">Storlek</span><span class="detail-value">' + (sizeLabels[lead.size] || '—') + '</span>' +
            '<span class="detail-label">Status</span><span class="detail-value"><span class="status-badge status-' + lead.status + '">' + statusLabels[lead.status] + '</span></span>' +
            '</div>' +
            (lead.contactName ? '<div class="detail-section"><h3>Kontaktperson</h3><div class="detail-grid">' +
                '<span class="detail-label">Namn</span><span class="detail-value">' + lead.contactName + '</span>' +
                (lead.contactRole ? '<span class="detail-label">Roll</span><span class="detail-value">' + lead.contactRole + '</span>' : '') +
                (lead.contactEmail ? '<span class="detail-label">E-post</span><span class="detail-value"><a href="mailto:' + lead.contactEmail + '">' + lead.contactEmail + '</a></span>' : '') +
                (lead.contactLinkedin ? '<span class="detail-label">LinkedIn</span><span class="detail-value"><a href="' + lead.contactLinkedin + '" target="_blank">Öppna profil</a></span>' : '') +
                '</div></div>' : '') +
            (lead.signals ? '<div class="detail-section"><h3>AI-signaler</h3><p>' + lead.signals + '</p></div>' : '') +
            (lead.notes ? '<div class="detail-section"><h3>Anteckningar</h3><p>' + lead.notes + '</p></div>' : '') +
            '<div class="modal-actions">' +
            '<label style="font-size:0.9rem;font-weight:500;color:#374151;margin-right:0.5rem;">Ändra status:</label>' +
            '<select id="modalStatusSelect" style="font-size:0.9rem;">' +
            '<option value="new"' + (lead.status === 'new' ? ' selected' : '') + '>Ny</option>' +
            '<option value="contacted"' + (lead.status === 'contacted' ? ' selected' : '') + '>Kontaktad</option>' +
            '<option value="meeting"' + (lead.status === 'meeting' ? ' selected' : '') + '>Möte bokat</option>' +
            '<option value="proposal"' + (lead.status === 'proposal' ? ' selected' : '') + '>Offert skickad</option>' +
            '<option value="closed"' + (lead.status === 'closed' ? ' selected' : '') + '>Avslutad</option>' +
            '</select></div></div>';

        document.getElementById('modalStatusSelect').addEventListener('change', async function (e) {
            await sb.from('leads').update({ status: e.target.value }).eq('id', lead.id);
            await loadLeads();
        });

        leadModal.classList.remove('hidden');
    }

    addLeadBtn.addEventListener('click', function () {
        addLeadForm.classList.toggle('hidden');
    });

    cancelLeadBtn.addEventListener('click', function () {
        addLeadForm.classList.add('hidden');
    });

    saveLeadBtn.addEventListener('click', async function () {
        var company = document.getElementById('companyName').value.trim();
        if (!company) {
            alert('Du måste ange ett företagsnamn.');
            return;
        }

        var newLead = {
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

        var result = await sb.from('leads').insert([newLead]);
        if (result.error) {
            alert('Något gick fel vid sparning.');
            return;
        }

        await loadLeads();
        document.getElementById('companyName').value = '';
        document.getElementById('industry').value = '';
        document.getElementById('contactName').value = '';
        document.getElementById('contactRole').value = '';
        document.getElementById('contactEmail').value = '';
        document.getElementById('contactLinkedin').value = '';
        document.getElementById('signals').value = '';
        document.getElementById('notes').value = '';
        addLeadForm.classList.add('hidden');
    });

    closeModal.addEventListener('click', function () { leadModal.classList.add('hidden'); });
    leadModal.addEventListener('click', function (e) { if (e.target === leadModal) leadModal.classList.add('hidden'); });

    searchBtn.addEventListener('click', renderLeads);
    searchInput.addEventListener('keyup', function (e) { if (e.key === 'Enter') renderLeads(); });
    regionFilter.addEventListener('change', renderLeads);
    sizeFilter.addEventListener('change', renderLeads);
    statusFilter.addEventListener('change', renderLeads);
});
