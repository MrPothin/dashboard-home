// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://fwnzesnicmzjqkvbjspr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bnplc25pY216anFrdmJqc3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzE1MzgsImV4cCI6MjA5MTk0NzUzOH0.vGtVxpIrVa4MViPBdk5B6MX-xdMzfVsB9M8N2qCAAas'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== THÈME =====
const savedTheme = localStorage.getItem('theme') || 'dark'
document.body.className = savedTheme

document.getElementById('btn-theme').addEventListener('click', () => {
  const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark'
  document.body.className = newTheme
  localStorage.setItem('theme', newTheme)
  document.getElementById('btn-theme').textContent = newTheme === 'dark' ? '🌙 Thème' : '☀️ Thème'
})

// ===== NAVIGATION =====
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const target = link.dataset.page
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    link.classList.add('active')
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.getElementById('section-' + target).classList.add('active')
    if (target === 'budget') initBudget()
    if (target === 'leasing') initLeasing()
  })
})

// ===== AUTH =====
function showDashboard() {
  document.getElementById('page-login').classList.remove('active')
  document.getElementById('page-dashboard').classList.add('active')
  initBudget()
}

function showLogin() {
  document.getElementById('page-dashboard').classList.remove('active')
  document.getElementById('page-login').classList.add('active')
}

document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  document.getElementById('login-error').textContent = ''
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) {
    document.getElementById('login-error').textContent = error.message
  } else {
    showDashboard()
  }
})

document.getElementById('btn-logout').addEventListener('click', async () => {
  await db.auth.signOut()
  showLogin()
})

db.auth.getSession().then(({ data: { session } }) => {
  if (session) showDashboard()
})

// ===== MODULE BUDGET =====
const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
let chargesFixes = []
let currentMois = new Date().getMonth() + 1
let currentAnnee = new Date().getFullYear()

async function initBudget() {
  // Charger les charges fixes
  const { data } = await db.from('budget_charges_fixes').select('*').eq('actif', true)
  chargesFixes = data || []
  renderSelecteurMois()
  await chargerMois(currentMois, currentAnnee)
}

function renderSelecteurMois() {
  const sel = document.getElementById('budget-selecteur-mois')
  if (!sel) return
  sel.innerHTML = MOIS_NOMS.map((m, i) =>
    `<option value="${i+1}" ${i+1 === currentMois ? 'selected' : ''}>${m} ${currentAnnee}</option>`
  ).join('')
  sel.addEventListener('change', async (e) => {
    currentMois = parseInt(e.target.value)
    await chargerMois(currentMois, currentAnnee)
  })
}

async function chargerMois(mois, annee) {
  // Charger ou créer le mois
  let { data: moisData } = await db.from('budget_mois').select('*').eq('mois', mois).eq('annee', annee).single()
  
  // Charger les variables
  let { data: variables } = await db.from('budget_variables').select('*').eq('mois', mois).eq('annee', annee)

  renderBudget(moisData, variables || [])
}

function renderBudget(moisData, variables) {
  const fixes = chargesFixes.filter(c => c.categorie === 'fixes')
  const abonnements = chargesFixes.filter(c => c.categorie === 'abonnements')
  const epargne = chargesFixes.filter(c => c.categorie === 'epargne')

  const totalFixes = fixes.reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalAbonnements = abonnements.reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalEpargne = epargne.reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalVariables = variables.reduce((s, v) => s + parseFloat(v.montant), 0)

  const salW = moisData?.salaire_wesley || 0
  const salL = moisData?.salaire_lauriane || 0
  const aides = moisData?.aides || 0
  const primes = moisData?.primes || 0
  const autresRev = moisData?.autres_revenus || 0
  const totalRevenus = salW + salL + aides + primes + autresRev

  const totalDepenses = totalFixes + totalAbonnements + totalVariables
  const solde = totalRevenus - totalDepenses - totalEpargne

  const pctDepenses = totalRevenus > 0 ? ((totalDepenses / totalRevenus) * 100).toFixed(1) : 0
  const pctEpargne = totalRevenus > 0 ? ((totalEpargne / totalRevenus) * 100).toFixed(1) : 0

  // Répartition proportionnelle
  const ratioL = totalRevenus > 0 ? salL / totalRevenus : 0.5
  const ratioW = totalRevenus > 0 ? salW / totalRevenus : 0.5

  document.getElementById('budget-content').innerHTML = `
    <div class="budget-grid">

      <!-- REVENUS -->
      <div class="card">
        <h3>💰 Revenus</h3>
        <div class="form-group"><label>Salaire Wesley</label><input type="number" class="rev-input" data-field="salaire_wesley" value="${salW}" /></div>
        <div class="form-group"><label>Salaire Lauriane</label><input type="number" class="rev-input" data-field="salaire_lauriane" value="${salL}" /></div>
        <div class="form-group"><label>Aides / Allocations</label><input type="number" class="rev-input" data-field="aides" value="${aides}" /></div>
        <div class="form-group"><label>Primes</label><input type="number" class="rev-input" data-field="primes" value="${primes}" /></div>
        <div class="form-group"><label>Autres revenus</label><input type="number" class="rev-input" data-field="autres_revenus" value="${autresRev}" /></div>
        <div class="total-line">Total revenus : <strong>${totalRevenus.toFixed(2)} €</strong></div>
        <button class="btn-save" onclick="sauvegarderRevenus()">💾 Sauvegarder</button>
      </div>

      <!-- DÉPENSES FIXES -->
      <div class="card">
        <h3>🏠 Dépenses fixes</h3>
        ${fixes.map(c => `
          <div class="form-group">
            <label>${c.label}</label>
            <input type="number" class="charge-input" data-id="${c.id}" value="${c.montant}" />
          </div>
        `).join('')}
        <div class="total-line">Total fixes : <strong>${totalFixes.toFixed(2)} €</strong></div>
        <button class="btn-save" onclick="sauvegarderCharges()">💾 Sauvegarder</button>
      </div>

      <!-- ABONNEMENTS -->
      <div class="card">
        <h3>📱 Abonnements</h3>
        ${abonnements.map(c => `
          <div class="form-group">
            <label>${c.label}</label>
            <input type="number" class="charge-input" data-id="${c.id}" value="${c.montant}" />
          </div>
        `).join('')}
        <div class="total-line">Total abonnements : <strong>${totalAbonnements.toFixed(2)} €</strong></div>
      </div>

      <!-- DÉPENSES VARIABLES -->
      <div class="card">
        <h3>🛒 Dépenses variables</h3>
        ${variables.map(v => `
          <div class="form-group var-row">
            <input type="text" class="var-label" data-id="${v.id}" value="${v.label}" placeholder="Catégorie" />
            <input type="number" class="var-montant" data-id="${v.id}" value="${v.montant}" />
            <button class="btn-delete" onclick="supprimerVariable('${v.id}')">✕</button>
          </div>
        `).join('')}
        <button class="btn-add" onclick="ajouterVariable()">+ Ajouter</button>
        <div class="total-line">Total variables : <strong>${totalVariables.toFixed(2)} €</strong></div>
        <button class="btn-save" onclick="sauvegarderVariables()">💾 Sauvegarder</button>
      </div>

      <!-- ÉPARGNE -->
      <div class="card">
        <h3>🏦 Épargne</h3>
        ${epargne.map(c => `
          <div class="form-group">
            <label>${c.label}</label>
            <input type="number" class="charge-input" data-id="${c.id}" value="${c.montant}" />
          </div>
        `).join('')}
        <div class="total-line">Total épargne : <strong>${totalEpargne.toFixed(2)} €</strong></div>
      </div>

      <!-- BILAN -->
      <div class="card bilan-card">
        <h3>📊 Bilan du mois</h3>
        <div class="bilan-row"><span>Total revenus</span><strong class="green">${totalRevenus.toFixed(2)} €</strong></div>
        <div class="bilan-row"><span>Total dépenses</span><strong class="red">${totalDepenses.toFixed(2)} €</strong></div>
        <div class="bilan-row"><span>Épargne</span><strong class="purple">${totalEpargne.toFixed(2)} €</strong></div>
        <div class="bilan-row solde"><span>Solde disponible</span><strong class="${solde >= 0 ? 'green' : 'red'}">${solde.toFixed(2)} €</strong></div>
        <div class="bilan-row"><span>% Dépenses</span><strong>${pctDepenses}%</strong></div>
        <div class="bilan-row"><span>% Épargne</span><strong>${pctEpargne}%</strong></div>
        <div class="bilan-sep"></div>
        <div class="bilan-row"><span>Part Lauriane (${(ratioL*100).toFixed(0)}%)</span><strong>${(totalEpargne * ratioL).toFixed(2)} €</strong></div>
        <div class="bilan-row"><span>Part Wesley (${(ratioW*100).toFixed(0)}%)</span><strong>${(totalEpargne * ratioW).toFixed(2)} €</strong></div>
      </div>

    </div>
  `
}

async function sauvegarderRevenus() {
  const inputs = document.querySelectorAll('.rev-input')
  const data = {}
  inputs.forEach(i => data[i.dataset.field] = parseFloat(i.value) || 0)
  data.mois = currentMois
  data.annee = currentAnnee

  await db.from('budget_mois').upsert(data, { onConflict: 'mois,annee' })
  await chargerMois(currentMois, currentAnnee)
}

async function sauvegarderCharges() {
  const inputs = document.querySelectorAll('.charge-input')
  for (const input of inputs) {
    await db.from('budget_charges_fixes').update({ montant: parseFloat(input.value) || 0 }).eq('id', input.dataset.id)
  }
  await chargerMois(currentMois, currentAnnee)
}

async function ajouterVariable() {
  await db.from('budget_variables').insert({ mois: currentMois, annee: currentAnnee, label: 'Nouvelle dépense', montant: 0 })
  await chargerMois(currentMois, currentAnnee)
}

async function supprimerVariable(id) {
  await db.from('budget_variables').delete().eq('id', id)
  await chargerMois(currentMois, currentAnnee)
}

async function sauvegarderVariables() {
  const rows = document.querySelectorAll('.var-row')
  for (const row of rows) {
    const id = row.querySelector('.var-label').dataset.id
    const label = row.querySelector('.var-label').value
    const montant = parseFloat(row.querySelector('.var-montant').value) || 0
    await db.from('budget_variables').update({ label, montant }).eq('id', id)
  }
  await chargerMois(currentMois, currentAnnee)
}

// ===== MODULE LEASING =====
async function initLeasing() {
  const { data } = await db.from('leasing').select('*').order('date_fin')
  renderLeasing(data || [])
}

function renderLeasing(contrats) {
  const today = new Date()

  document.getElementById('leasing-content').innerHTML = `
    <div class="leasing-grid">
      ${contrats.map(c => {
        const debut = new Date(c.date_debut)
        const fin = new Date(c.date_fin)
        const totalMois = Math.round((fin - debut) / (1000 * 60 * 60 * 24 * 30))
        const moisRestants = Math.max(0, Math.round((fin - today) / (1000 * 60 * 60 * 24 * 30)))
        const moisEcoules = Math.round((today - debut) / (1000 * 60 * 60 * 24 * 30))
        const pctTemps = Math.min(100, Math.round((moisEcoules / totalMois) * 100))
        const pctKm = c.kilometrage_max > 0 ? Math.min(100, Math.round((c.kilometrage_actuel / c.kilometrage_max) * 100)) : 0
        const couleur = pctTemps > 80 ? '#FF6B6B' : pctTemps > 50 ? '#FFA500' : '#4CAF50'

        return `
          <div class="card leasing-card" onclick="ouvrirDetailLeasing('${c.id}')" style="cursor:pointer">
            <div class="leasing-header">
              <div>
                <h3>🚗 ${c.vehicule}</h3>
                <span class="leasing-nom">${c.nom}</span>
              </div>
              <div class="leasing-mensualite">${parseFloat(c.mensualite).toFixed(2)} €<span>/mois</span></div>
            </div>
            <div class="leasing-info-grid">
              <div class="leasing-info"><span>Fin</span><strong>${new Date(c.date_fin).toLocaleDateString('fr-FR')}</strong></div>
              <div class="leasing-info"><span>Mois restants</span><strong>${moisRestants}</strong></div>
            </div>
            <div class="progress-block">
              <div class="progress-label"><span>Durée écoulée</span><span>${pctTemps}%</span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pctTemps}%; background:${couleur}"></div></div>
            </div>
            ${c.kilometrage_max > 0 ? `
            <div class="progress-block">
              <div class="progress-label"><span>Kilométrage</span><span>${pctKm}%</span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pctKm}%; background:${pctKm > 80 ? '#FF6B6B' : '#4F46E5'}"></div></div>
            </div>` : ''}
            <p class="leasing-tap-hint">Appuyer pour le détail →</p>
          </div>
        `
      }).join('')}
      <div class="card leasing-add" onclick="ajouterLeasing()">
        <div class="leasing-add-inner"><span>+</span><p>Ajouter un contrat</p></div>
      </div>
    </div>

    <!-- MODAL AJOUT/EDIT -->
    <div id="leasing-modal" class="modal hidden">
      <div class="modal-card">
        <h3 id="modal-title">Nouveau contrat</h3>
        <div class="form-group"><label>Nom</label><input type="text" id="l-nom" placeholder="Ex: Leasing Lauriane" /></div>
        <div class="form-group"><label>Véhicule</label><input type="text" id="l-vehicule" placeholder="Ex: Peugeot e-208" /></div>
        <div class="form-group"><label>Mensualité (€)</label><input type="number" id="l-mensualite" /></div>
        <div class="form-group"><label>Date début</label><input type="date" id="l-debut" /></div>
        <div class="form-group"><label>Date fin</label><input type="date" id="l-fin" /></div>
        <div class="form-group"><label>Km max</label><input type="number" id="l-km-max" /></div>
        <div class="form-group"><label>Km actuels</label><input type="number" id="l-km-actuel" /></div>
        <div class="form-group"><label>Notes</label><input type="text" id="l-notes" /></div>
        <div class="modal-actions">
          <button onclick="fermerModal()">Annuler</button>
          <button class="btn-primary" onclick="sauvegarderLeasing()">💾 Sauvegarder</button>
        </div>
      </div>
    </div>

    <!-- VUE DÉTAIL -->
    <div id="leasing-detail" class="modal hidden">
      <div class="modal-card detail-card">
        <div id="detail-content"></div>
      </div>
    </div>
  `
}

async function ouvrirDetailLeasing(id) {
  const { data: c } = await db.from('leasing').select('*').eq('id', id).single()
  const { data: releves } = await db.from('leasing_releves').select('*').eq('leasing_id', id).order('date', { ascending: true })

  const today = new Date()
  const debut = new Date(c.date_debut)
  const fin = new Date(c.date_fin)

  const totalJours = Math.round((fin - debut) / (1000 * 60 * 60 * 24))
  const joursEcoules = Math.round((today - debut) / (1000 * 60 * 60 * 24))
  const joursRestants = Math.max(0, Math.round((fin - today) / (1000 * 60 * 60 * 24)))
  const pctTemps = Math.min(100, Math.round((joursEcoules / totalJours) * 100))
  const pctKm = c.kilometrage_max > 0 ? Math.min(100, Math.round((c.kilometrage_actuel / c.kilometrage_max) * 100)) : 0

  const kmDepart = releves && releves.length > 0 ? releves[0].kilometrage : 0
  const kmParcourus = c.kilometrage_actuel - kmDepart
  const kmRestants = Math.max(0, c.kilometrage_max - kmParcourus)
  const kmIdealJour = totalJours > 0 ? c.kilometrage_max / totalJours : 0
  const kmReelJour = joursEcoules > 0 ? kmParcourus / joursEcoules : 0  const kmAdaptatifJour = joursRestants > 0 ? kmRestants / joursRestants : 0
  const kmProjection = Math.round(kmParcourus + kmReelJour * joursRestants)
  const depassement = kmProjection - c.kilometrage_max

  const couleurTemps = pctTemps > 80 ? '#FF6B6B' : pctTemps > 50 ? '#FFA500' : '#4CAF50'
  const couleurKm = pctKm > 80 ? '#FF6B6B' : pctKm > 50 ? '#FFA500' : '#4F46E5'

  // Graphique SVG simplifié
  let graphique = ''
  if (releves && releves.length > 1) {
    const w = 500, h = 200, pad = 40
    const maxKm = Math.max(...releves.map(r => r.kilometrage))
    const dates = releves.map(r => new Date(r.date))
    const minDate = dates[0], maxDate = dates[dates.length - 1]
    const rangeDate = maxDate - minDate || 1

    const points = releves.map(r => {
      const x = pad + ((new Date(r.date) - minDate) / rangeDate) * (w - pad * 2)
      const y = h - pad - ((r.kilometrage / (maxKm * 1.1)) * (h - pad * 2))
      return `${x},${y}`
    }).join(' ')

    // Ligne idéale
    const kmIdealFin = Math.round(kmIdealJour * (maxDate - debut) / (1000 * 60 * 60 * 24))
    const x0 = pad, y0 = h - pad - ((releves[0].kilometrage / (maxKm * 1.1)) * (h - pad * 2))
    const x1 = w - pad, y1 = h - pad - ((kmIdealFin / (maxKm * 1.1)) * (h - pad * 2))

    graphique = `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;border-radius:12px;background:var(--bg)">
        <polyline points="${points}" fill="none" stroke="#4F46E5" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#666" stroke-width="1.5" stroke-dasharray="6,4"/>
        ${releves.map(r => {
          const x = pad + ((new Date(r.date) - minDate) / rangeDate) * (w - pad * 2)
          const y = h - pad - ((r.kilometrage / (maxKm * 1.1)) * (h - pad * 2))
          return `<circle cx="${x}" cy="${y}" r="4" fill="#4F46E5"/>`
        }).join('')}
      </svg>
    `
  }

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-header">
      <button class="btn-back" onclick="fermerDetail()">← Retour</button>
      <div>
        <h2>${c.vehicule}</h2>
        <span class="leasing-nom">${c.nom} · ${new Date(c.date_debut).toLocaleDateString('fr-FR')} → ${new Date(c.date_fin).toLocaleDateString('fr-FR')} · ${c.kilometrage_max.toLocaleString()} km</span>
      </div>
      <button class="btn-edit-small" onclick="editLeasing('${c.id}')">✏️</button>
    </div>

    ${depassement > 0 ? `<div class="alert-danger">⚠️ Dépassement prévu : +${depassement.toLocaleString()} km</div>` : ''}

    <!-- JAUGES -->
    <div class="jauges-grid">
      <div class="card jauge-card">
        ${svgJauge(pctKm, couleurKm)}
        <p>Km utilisés</p>
      </div>
      <div class="card jauge-card">
        ${svgJauge(pctTemps, couleurTemps)}
        <p>Temps écoulé</p>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-grid">
      <div class="card stat-card"><span>PARCOURUS</span><strong class="stat-value blue">${kmParcourus.toLocaleString()}</strong><small>sur ${c.kilometrage_max.toLocaleString()} km</small></div>
      <div class="card stat-card"><span>RESTANTS</span><strong class="stat-value purple">${kmRestants.toLocaleString()}</strong><small>${joursRestants} jours</small></div>
    </div>

    <!-- RYTHME -->
    <div class="card rythme-card">
      <h4>RYTHME</h4>
      <div class="rythme-grid">
        <div><span>MOY/JOUR</span><strong class="orange">${kmReelJour.toFixed(1)}</strong><small>idéal: ${kmIdealJour.toFixed(1)}</small></div>
        <div><span>TENDANCE</span><strong class="${depassement > 0 ? 'red' : 'green'}">${kmAdaptatifJour.toFixed(1)}</strong><small>${depassement > 0 ? '↑ dépassement' : '↓ dans les clous'}</small></div>
      </div>
    </div>

    <!-- BUDGET ADAPTATIF -->
    <div class="card budget-adapt-card">
      <h4>BUDGET ADAPTATIF</h4>
      <p class="adapt-subtitle">Ce que vous pouvez encore rouler :</p>
      <div class="adapt-grid">
        <div><span>PAR JOUR</span><strong class="blue">${kmAdaptatifJour.toFixed(1)}</strong><small>km/jour</small></div>
        <div><span>PAR SEM.</span><strong class="blue">${(kmAdaptatifJour * 7).toFixed(0)}</strong><small>km/sem</small></div>
        <div><span>PAR MOIS</span><strong class="blue">${(kmAdaptatifJour * 30).toFixed(0)}</strong><small>km/mois</small></div>
      </div>
    </div>

    <!-- PROJECTION -->
    <div class="card projection-card">
      <h4>PROJECTION FIN DE CONTRAT</h4>
      <div class="projection-row"><span>Km projetés</span><strong class="${depassement > 0 ? 'red' : 'green'}">${kmProjection.toLocaleString()}</strong></div>
      <div class="projection-row"><span>${depassement > 0 ? 'Dépassement' : 'Marge'}</span><strong class="${depassement > 0 ? 'red' : 'green'}">${depassement > 0 ? '+' : ''}${depassement.toLocaleString()} km</strong></div>
    </div>

    <!-- GRAPHIQUE -->
    ${releves && releves.length > 1 ? `
    <div class="card">
      <h4>Évolution — Km parcourus vs rythme idéal</h4>
      <div style="margin-top:16px">${graphique}</div>
      <div style="display:flex;gap:16px;margin-top:12px;font-size:0.8rem;color:var(--text-muted)">
        <span>— Réel</span><span style="color:#666">- - Idéal</span>
      </div>
    </div>` : ''}

    <!-- RELEVÉS -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h4>Relevés kilométriques</h4>
        <button class="btn-primary" style="padding:8px 16px;font-size:0.85rem" onclick="ajouterReleve('${c.id}')">+ Relevé</button>
      </div>
      ${releves && releves.length > 0 ? releves.slice().reverse().map((r, i, arr) => {
        const prev = arr[i + 1]
        const diff = prev ? r.kilometrage - prev.kilometrage : null
        const jours = prev ? Math.round((new Date(r.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24)) : null
        return `
          <div class="releve-row">
            <div><strong>${r.kilometrage.toLocaleString()} km</strong><small>${new Date(r.date).toLocaleDateString('fr-FR')}</small></div>
            <div style="text-align:right">
              ${diff !== null ? `<strong class="blue">+${diff} km</strong><small>${jours > 0 ? (diff/jours).toFixed(1) : '—'} km/j sur ${jours}j</small>` : '<small>Premier relevé</small>'}
            </div>
            <button class="btn-delete" onclick="supprimerReleve('${r.id}', '${c.id}')">✕</button>
          </div>
        `
      }).join('') : '<p style="color:var(--text-muted);font-style:italic">Aucun relevé pour l\'instant.</p>'}
    </div>

    <!-- MODAL RELEVÉ -->
    <div id="releve-modal" class="modal hidden">
      <div class="modal-card" style="max-width:360px">
        <h3>Nouveau relevé</h3>
        <p style="color:var(--text-muted);font-size:0.9rem">Entrez le compteur kilométrique</p>
        <div class="form-group"><label>Date</label><input type="date" id="r-date" /></div>
        <div class="form-group"><label>Compteur (km)</label><input type="number" id="r-km" placeholder="ex: 1 250" /></div>
        <div class="modal-actions">
          <button onclick="fermerReleveModal()">Annuler</button>
          <button class="btn-primary" onclick="sauvegarderReleve()">Enregistrer</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('leasing-detail').classList.remove('hidden')
}

function svgJauge(pct, couleur) {
  const r = 45, cx = 60, cy = 60
  const circonference = 2 * Math.PI * r
  const offset = circonference - (pct / 100) * circonference
  return `
    <svg viewBox="0 0 120 120" style="width:100px;height:100px">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${couleur}" stroke-width="10"
        stroke-dasharray="${circonference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
        fill="var(--text)" font-size="18" font-weight="bold">${pct}%</text>
    </svg>
  `
}

let currentLeasingId = null

function ajouterReleve(leasingId) {
  currentLeasingId = leasingId
  const today = new Date().toISOString().split('T')[0]
  document.getElementById('r-date').value = today
  document.getElementById('r-km').value = ''
  document.getElementById('releve-modal').classList.remove('hidden')
}

function fermerReleveModal() {
  document.getElementById('releve-modal').classList.add('hidden')
}

async function sauvegarderReleve() {
  const km = parseInt(document.getElementById('r-km').value)
  const date = document.getElementById('r-date').value
  if (!km || !date) return

  await db.from('leasing_releves').insert({ leasing_id: currentLeasingId, date, kilometrage: km })
  await db.from('leasing').update({ kilometrage_actuel: km }).eq('id', currentLeasingId)

  fermerReleveModal()
  ouvrirDetailLeasing(currentLeasingId)
}

async function supprimerReleve(id, leasingId) {
  if (!confirm('Supprimer ce relevé ?')) return
  await db.from('leasing_releves').delete().eq('id', id)
  ouvrirDetailLeasing(leasingId)
}

function fermerDetail() {
  document.getElementById('leasing-detail').classList.add('hidden')
}

let leasingEditId = null

function ajouterLeasing() {
  leasingEditId = null
  document.getElementById('modal-title').textContent = 'Nouveau contrat'
  document.querySelectorAll('#leasing-modal input').forEach(i => i.value = '')
  document.getElementById('leasing-modal').classList.remove('hidden')
}

async function editLeasing(id) {
  const { data } = await db.from('leasing').select('*').eq('id', id).single()
  leasingEditId = id
  document.getElementById('modal-title').textContent = 'Modifier le contrat'
  document.getElementById('l-nom').value = data.nom
  document.getElementById('l-vehicule').value = data.vehicule
  document.getElementById('l-mensualite').value = data.mensualite
  document.getElementById('l-debut').value = data.date_debut
  document.getElementById('l-fin').value = data.date_fin
  document.getElementById('l-km-max').value = data.kilometrage_max
  document.getElementById('l-km-actuel').value = data.kilometrage_actuel
  document.getElementById('l-notes').value = data.notes
  document.getElementById('leasing-modal').classList.remove('hidden')
}

function fermerModal() {
  document.getElementById('leasing-modal').classList.add('hidden')
}

async function sauvegarderLeasing() {
  const data = {
    nom: document.getElementById('l-nom').value,
    vehicule: document.getElementById('l-vehicule').value,
    mensualite: parseFloat(document.getElementById('l-mensualite').value) || 0,
    date_debut: document.getElementById('l-debut').value,
    date_fin: document.getElementById('l-fin').value,
    kilometrage_max: parseInt(document.getElementById('l-km-max').value) || 0,
    kilometrage_actuel: parseInt(document.getElementById('l-km-actuel').value) || 0,
    notes: document.getElementById('l-notes').value
  }

  if (leasingEditId) {
    await db.from('leasing').update(data).eq('id', leasingEditId)
  } else {
    await db.from('leasing').insert(data)
  }

  fermerModal()
  initLeasing()
}

async function supprimerLeasing(id) {
  if (!confirm('Supprimer ce contrat ?')) return
  await db.from('leasing').delete().eq('id', id)
  initLeasing()
}