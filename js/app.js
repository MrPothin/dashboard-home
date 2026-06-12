// =====================================================
// DASHBOARD HOME — Wesley & Lauriane
// HTML/CSS/JS vanilla + Supabase
// =====================================================

// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://fwnzesnicmzjqkvbjspr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bnplc25pY216anFrdmJqc3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzE1MzgsImV4cCI6MjA5MTk0NzUzOH0.vGtVxpIrVa4MViPBdk5B6MX-xdMzfVsB9M8N2qCAAas'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== HELPERS =====
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function eur(n) {
  return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const JOURS_NOMS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const JOUR_MS = 1000 * 60 * 60 * 24

// =====================================================
// THÈME
// =====================================================
function appliquerTheme(theme) {
  document.body.className = theme
  localStorage.setItem('theme', theme)
  $$('.btn-theme').forEach(b => {
    b.textContent = b.classList.contains('btn-icon')
      ? (theme === 'dark' ? '🌙' : '☀️')
      : (theme === 'dark' ? '🌙 Thème' : '☀️ Thème')
  })
}

appliquerTheme(localStorage.getItem('theme') || 'dark')

$$('.btn-theme').forEach(b => b.addEventListener('click', () => {
  appliquerTheme(document.body.classList.contains('dark') ? 'light' : 'dark')
}))

// =====================================================
// MODULES (registre — ajouter un module = une entrée ici)
// =====================================================
const MODULES = [
  { id: 'accueil', label: 'Accueil', icon: '🏠', init: initAccueil },
  { id: 'budget', label: 'Budget', icon: '💰', init: initBudget },
  { id: 'leasing', label: 'Leasing', icon: '🚗', init: initLeasing },
  { id: 'tierlist', label: 'Tier List', icon: '🏆', init: initTierlist },
]

function renderNav() {
  $('#nav-links').innerHTML = MODULES.map(m => `
    <a href="#" class="nav-link" data-page="${m.id}">
      <span class="nav-icon">${m.icon}</span>
      <span class="nav-text">${m.label}</span>
    </a>
  `).join('')
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      naviguerVers(link.dataset.page)
    })
  })
}

function naviguerVers(pageId) {
  const module = MODULES.find(m => m.id === pageId)
  if (!module) return
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === pageId))
  $('#content').scrollTop = 0
  window.scrollTo(0, 0)
  module.init()
}

// =====================================================
// AUTH
// =====================================================
function showDashboard() {
  $('#page-login').classList.remove('active')
  $('#page-dashboard').classList.add('active')
  naviguerVers('accueil')
}

function showLogin() {
  $('#page-dashboard').classList.remove('active')
  $('#page-login').classList.add('active')
}

async function connecter() {
  const email = $('#email').value
  const password = $('#password').value
  $('#login-error').textContent = ''
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) {
    $('#login-error').textContent = 'Connexion impossible : ' + error.message
  } else {
    showDashboard()
  }
}

$('#btn-login').addEventListener('click', connecter)
$('#password').addEventListener('keydown', (e) => { if (e.key === 'Enter') connecter() })

$$('.btn-logout').forEach(b => b.addEventListener('click', async () => {
  await db.auth.signOut()
  showLogin()
}))

// =====================================================
// MODULE ACCUEIL
// =====================================================
function meteoIcon(code) {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  if (code <= 99) return '⛈️'
  return '🌡️'
}

function meteoLabel(code) {
  if (code === 0) return 'Ciel dégagé'
  if (code <= 3) return 'Partiellement nuageux'
  if (code <= 48) return 'Brouillard'
  if (code <= 67) return 'Pluie'
  if (code <= 77) return 'Neige'
  if (code <= 82) return 'Averses'
  if (code <= 99) return 'Orage'
  return 'Conditions variables'
}

async function initAccueil() {
  const now = new Date()
  const mois = now.getMonth() + 1
  const annee = now.getFullYear()

  $('#content').innerHTML = '<p class="muted">Chargement…</p>'

  const [moisRes, chargesRes, varsRes, leasingRes, tlRes] = await Promise.all([
    db.from('budget_mois').select('*').eq('mois', mois).eq('annee', annee).maybeSingle(),
    db.from('budget_charges_fixes').select('*').eq('actif', true),
    db.from('budget_variables').select('*').eq('mois', mois).eq('annee', annee),
    db.from('leasing').select('*').order('date_fin'),
    db.from('tierlist').select('*', { count: 'exact', head: true }),
  ])

  const moisData = moisRes.data
  const charges = chargesRes.data || []
  const variables = varsRes.data || []
  const contrats = leasingRes.data || []
  const nbTierlists = tlRes.count || 0

  const totalFixes = charges.filter(c => c.categorie === 'fixes').reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalAbonnements = charges.filter(c => c.categorie === 'abonnements').reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalEpargne = charges.filter(c => c.categorie === 'epargne').reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalVariables = variables.reduce((s, v) => s + parseFloat(v.montant), 0)
  const totalRevenus = moisData
    ? (moisData.salaire_wesley + moisData.salaire_lauriane + moisData.aides + moisData.primes + moisData.autres_revenus)
    : 0
  const totalDepenses = totalFixes + totalAbonnements + totalVariables
  const solde = totalRevenus - totalDepenses - totalEpargne

  // Météo Manosque (Open-Meteo, gratuit, sans clé)
  let meteo = null
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.8367&longitude=5.7869&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Paris')
    const json = await res.json()
    meteo = json.current
  } catch (e) { /* météo indisponible : on affiche sans */ }

  $('#content').innerHTML = `
    <div class="accueil-header">
      <div>
        <h2>Bonjour Wesley & Lauriane 👋</h2>
        <p class="accueil-date">${JOURS_NOMS[now.getDay()]} ${now.getDate()} ${MOIS_NOMS[now.getMonth()].toLowerCase()} ${annee}</p>
      </div>
      ${meteo ? `
      <div class="meteo-widget">
        <span class="meteo-icon">${meteoIcon(meteo.weathercode)}</span>
        <div class="meteo-infos">
          <strong>${Math.round(meteo.temperature_2m)}°C</strong>
          <small>${meteoLabel(meteo.weathercode)}</small>
          <small>💨 ${Math.round(meteo.windspeed_10m)} km/h · Manosque</small>
        </div>
      </div>` : ''}
    </div>

    <div class="accueil-grid">

      <!-- CARTE BUDGET -->
      <div class="card accueil-card" onclick="naviguerVers('budget')">
        <div class="accueil-card-header">
          <span class="accueil-card-icon">💰</span>
          <h3>Budget</h3>
          <span class="accueil-card-arrow">→</span>
        </div>
        <p class="accueil-card-sub">${MOIS_NOMS[mois - 1]} ${annee}</p>
        <div class="accueil-solde ${solde >= 0 ? 'green' : 'red'}">${solde >= 0 ? '+' : ''}${solde.toFixed(0)} €</div>
        <p class="accueil-card-label">Solde disponible</p>
        <div class="accueil-mini-stats">
          <div><span>Revenus</span><strong>${totalRevenus.toFixed(0)} €</strong></div>
          <div><span>Dépenses</span><strong>${totalDepenses.toFixed(0)} €</strong></div>
          <div><span>Épargne</span><strong>${totalEpargne.toFixed(0)} €</strong></div>
        </div>
      </div>

      <!-- CARTE LEASING -->
      <div class="card accueil-card" onclick="naviguerVers('leasing')">
        <div class="accueil-card-header">
          <span class="accueil-card-icon">🚗</span>
          <h3>Leasing</h3>
          <span class="accueil-card-arrow">→</span>
        </div>
        <p class="accueil-card-sub">${contrats.length} contrat(s) actif(s)</p>
        ${contrats.map(c => {
          const debut = new Date(c.date_debut)
          const fin = new Date(c.date_fin)
          const joursRestants = Math.max(0, Math.round((fin - now) / JOUR_MS))
          const pct = Math.min(100, Math.max(0, Math.round(((now - debut) / (fin - debut)) * 100)))
          const couleur = pct > 80 ? '#FF6B6B' : pct > 50 ? '#FFA500' : '#4CAF50'
          return `
            <div class="accueil-leasing-row">
              <div class="accueil-leasing-info">
                <strong>${esc(c.vehicule)}</strong>
                <small>${joursRestants} jours restants</small>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${couleur}"></div></div>
              <span class="muted small">${pct}%</span>
            </div>
          `
        }).join('') || '<p class="muted">Aucun contrat.</p>'}
      </div>

      <!-- CARTE TIER LIST -->
      <div class="card accueil-card" onclick="naviguerVers('tierlist')">
        <div class="accueil-card-header">
          <span class="accueil-card-icon">🏆</span>
          <h3>Tier List</h3>
          <span class="accueil-card-arrow">→</span>
        </div>
        <p class="accueil-card-sub">${nbTierlists} tier list(s)</p>
        <p class="accueil-card-label">Classez et comparez vos avis à deux !</p>
      </div>

    </div>
  `
}

// =====================================================
// MODULE BUDGET
// =====================================================
let chargesFixes = []
let budgetMois = new Date().getMonth() + 1
let budgetAnnee = new Date().getFullYear()
let budgetVue = 'mois' // 'mois' | 'annee'

async function initBudget() {
  $('#content').innerHTML = '<p class="muted">Chargement…</p>'
  const { data } = await db.from('budget_charges_fixes').select('*').eq('actif', true).order('label')
  chargesFixes = data || []
  if (budgetVue === 'annee') await chargerAnneeBudget()
  else await chargerMoisBudget()
}

function changerMoisBudget(delta) {
  budgetMois += delta
  if (budgetMois > 12) { budgetMois = 1; budgetAnnee++ }
  if (budgetMois < 1) { budgetMois = 12; budgetAnnee-- }
  chargerMoisBudget()
}

function changerAnneeBudget(delta) {
  budgetAnnee += delta
  chargerAnneeBudget()
}

function basculerVueBudget() {
  budgetVue = budgetVue === 'mois' ? 'annee' : 'mois'
  initBudget()
}

async function chargerMoisBudget() {
  const [{ data: moisData }, { data: variables }] = await Promise.all([
    db.from('budget_mois').select('*').eq('mois', budgetMois).eq('annee', budgetAnnee).maybeSingle(),
    db.from('budget_variables').select('*').eq('mois', budgetMois).eq('annee', budgetAnnee),
  ])
  renderBudgetMois(moisData, variables || [])
}

function svgDonut(segments) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return '<p class="muted">Aucune dépense ce mois-ci.</p>'
  const cx = 80, cy = 80, r = 58, sw = 30
  const circ = 2 * Math.PI * r
  let acc = 0
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const frac = s.value / total
    const angle = (acc / total) * 360 - 90
    acc += s.value
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
      stroke-dasharray="${Math.max(0, frac * circ - 1)} ${circ}" transform="rotate(${angle} ${cx} ${cy})"/>`
  }).join('')
  return `
    <div class="donut-wrap">
      <svg viewBox="0 0 160 160" class="donut-svg">${arcs}</svg>
      <div class="donut-legend">
        ${segments.map(s => `
          <div class="legend-row">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span class="legend-label">${esc(s.label)}</span>
            <strong>${eur(s.value)}</strong>
            <small>${total > 0 ? ((s.value / total) * 100).toFixed(0) : 0}%</small>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function renderBudgetMois(moisData, variables) {
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

  // Répartition proportionnelle aux salaires
  const totalSalaires = salW + salL
  const ratioW = totalSalaires > 0 ? salW / totalSalaires : 0.5
  const ratioL = totalSalaires > 0 ? salL / totalSalaires : 0.5
  const aPartager = totalDepenses + totalEpargne

  $('#content').innerHTML = `
    <div class="section-header">
      <h2>💰 Budget</h2>
      <div class="section-header-actions">
        <div class="mois-nav">
          <button class="btn-icon" onclick="changerMoisBudget(-1)">←</button>
          <strong>${MOIS_NOMS[budgetMois - 1]} ${budgetAnnee}</strong>
          <button class="btn-icon" onclick="changerMoisBudget(1)">→</button>
        </div>
        <button class="btn-ghost" onclick="basculerVueBudget()">📅 Historique annuel</button>
      </div>
    </div>

    <div class="budget-grid">

      <!-- REVENUS -->
      <div class="card">
        <h3><span class="badge badge-green">Revenus</span></h3>
        <div class="form-group"><label>Salaire Wesley</label><input type="number" inputmode="decimal" class="rev-input" data-field="salaire_wesley" value="${salW}" /></div>
        <div class="form-group"><label>Salaire Lauriane</label><input type="number" inputmode="decimal" class="rev-input" data-field="salaire_lauriane" value="${salL}" /></div>
        <div class="form-group"><label>Aides / Allocations</label><input type="number" inputmode="decimal" class="rev-input" data-field="aides" value="${aides}" /></div>
        <div class="form-group"><label>Primes</label><input type="number" inputmode="decimal" class="rev-input" data-field="primes" value="${primes}" /></div>
        <div class="form-group"><label>Autres revenus</label><input type="number" inputmode="decimal" class="rev-input" data-field="autres_revenus" value="${autresRev}" /></div>
        <div class="total-line">Total revenus : <strong>${eur(totalRevenus)}</strong></div>
        <button class="btn-save" onclick="sauvegarderRevenus()">💾 Sauvegarder</button>
      </div>

      <!-- DÉPENSES FIXES -->
      <div class="card">
        <h3><span class="badge badge-indigo">Dépenses fixes</span></h3>
        ${fixes.map(c => `
          <div class="form-group">
            <label>${esc(c.label)}</label>
            <input type="number" inputmode="decimal" class="charge-input" data-id="${c.id}" value="${c.montant}" />
          </div>
        `).join('') || '<p class="muted">Aucune charge fixe.</p>'}
        <div class="total-line">Total fixes : <strong>${eur(totalFixes)}</strong></div>
        <button class="btn-save" onclick="sauvegarderCharges()">💾 Sauvegarder</button>
      </div>

      <!-- ABONNEMENTS -->
      <div class="card">
        <h3><span class="badge badge-cyan">Abonnements</span></h3>
        ${abonnements.map(c => `
          <div class="form-group">
            <label>${esc(c.label)}</label>
            <input type="number" inputmode="decimal" class="charge-input" data-id="${c.id}" value="${c.montant}" />
          </div>
        `).join('') || '<p class="muted">Aucun abonnement.</p>'}
        <div class="total-line">Total abonnements : <strong>${eur(totalAbonnements)}</strong></div>
        <button class="btn-save" onclick="sauvegarderCharges()">💾 Sauvegarder</button>
      </div>

      <!-- DÉPENSES VARIABLES -->
      <div class="card">
        <h3><span class="badge badge-orange">Dépenses variables</span></h3>
        ${variables.map(v => `
          <div class="form-group var-row">
            <input type="text" class="var-label" data-id="${v.id}" value="${esc(v.label)}" placeholder="Catégorie" />
            <input type="number" inputmode="decimal" class="var-montant" data-id="${v.id}" value="${v.montant}" />
            <button class="btn-delete" onclick="supprimerVariable('${v.id}')">✕</button>
          </div>
        `).join('')}
        <button class="btn-add" onclick="ajouterVariable()">+ Ajouter une dépense</button>
        <div class="total-line">Total variables : <strong>${eur(totalVariables)}</strong></div>
        <button class="btn-save" onclick="sauvegarderVariables()">💾 Sauvegarder</button>
      </div>

      <!-- ÉPARGNE -->
      <div class="card">
        <h3><span class="badge badge-purple">Épargne</span></h3>
        ${epargne.map(c => `
          <div class="form-group">
            <label>${esc(c.label)}</label>
            <input type="number" inputmode="decimal" class="charge-input" data-id="${c.id}" value="${c.montant}" />
          </div>
        `).join('') || '<p class="muted">Aucune épargne configurée.</p>'}
        <div class="total-line">Total épargne : <strong>${eur(totalEpargne)}</strong></div>
        <button class="btn-save" onclick="sauvegarderCharges()">💾 Sauvegarder</button>
      </div>

      <!-- RÉPARTITION (CAMEMBERT) -->
      <div class="card">
        <h3><span class="badge badge-indigo">Répartition</span></h3>
        ${svgDonut([
          { label: 'Fixes', value: totalFixes, color: '#4F46E5' },
          { label: 'Abonnements', value: totalAbonnements, color: '#06B6D4' },
          { label: 'Variables', value: totalVariables, color: '#F59E0B' },
          { label: 'Épargne', value: totalEpargne, color: '#8B5CF6' },
        ])}
      </div>

      <!-- BILAN -->
      <div class="card bilan-card">
        <h3>📊 Bilan du mois</h3>
        <div class="bilan-row"><span>Total revenus</span><strong class="green">${eur(totalRevenus)}</strong></div>
        <div class="bilan-row"><span>Total dépenses</span><strong class="red">${eur(totalDepenses)}</strong></div>
        <div class="bilan-row"><span>Épargne</span><strong class="purple">${eur(totalEpargne)}</strong></div>
        <div class="bilan-row solde"><span>Solde disponible</span><strong class="${solde >= 0 ? 'green' : 'red'}">${eur(solde)}</strong></div>
        <div class="bilan-row"><span>% Dépenses</span><strong>${pctDepenses}%</strong></div>
        <div class="bilan-row"><span>% Épargne</span><strong>${pctEpargne}%</strong></div>
        <div class="bilan-sep"></div>
        <p class="muted small">Répartition proportionnelle aux salaires (dépenses + épargne) :</p>
        <div class="bilan-row"><span>Part Wesley (${(ratioW * 100).toFixed(0)}%)</span><strong>${eur(aPartager * ratioW)}</strong></div>
        <div class="bilan-row"><span>Part Lauriane (${(ratioL * 100).toFixed(0)}%)</span><strong>${eur(aPartager * ratioL)}</strong></div>
      </div>

    </div>
  `
}

// --- Historique annuel ---
async function chargerAnneeBudget() {
  const [{ data: moisRows }, { data: varRows }] = await Promise.all([
    db.from('budget_mois').select('*').eq('annee', budgetAnnee),
    db.from('budget_variables').select('*').eq('annee', budgetAnnee),
  ])
  renderBudgetAnnee(moisRows || [], varRows || [])
}

function renderBudgetAnnee(moisRows, varRows) {
  const totalFixes = chargesFixes.filter(c => c.categorie === 'fixes').reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalAbonnements = chargesFixes.filter(c => c.categorie === 'abonnements').reduce((s, c) => s + parseFloat(c.montant), 0)
  const totalEpargne = chargesFixes.filter(c => c.categorie === 'epargne').reduce((s, c) => s + parseFloat(c.montant), 0)

  let cumRevenus = 0, cumDepenses = 0, cumEpargne = 0, cumSolde = 0

  const lignes = MOIS_NOMS.map((nom, i) => {
    const m = i + 1
    const md = moisRows.find(r => r.mois === m)
    const vars = varRows.filter(v => v.mois === m)
    const totalVariables = vars.reduce((s, v) => s + parseFloat(v.montant), 0)
    const aDesDonnees = md || vars.length > 0

    if (!aDesDonnees) {
      return `<div class="annee-row vide"><span class="annee-mois">${nom}</span><span class="muted">—</span></div>`
    }

    const revenus = md ? (md.salaire_wesley + md.salaire_lauriane + md.aides + md.primes + md.autres_revenus) : 0
    const depenses = totalFixes + totalAbonnements + totalVariables
    const solde = revenus - depenses - totalEpargne
    cumRevenus += revenus; cumDepenses += depenses; cumEpargne += totalEpargne; cumSolde += solde

    return `
      <div class="annee-row" onclick="budgetMois=${m};budgetVue='mois';initBudget()">
        <span class="annee-mois">${nom}</span>
        <span class="green">${revenus.toFixed(0)} €</span>
        <span class="red">${depenses.toFixed(0)} €</span>
        <span class="purple">${totalEpargne.toFixed(0)} €</span>
        <strong class="${solde >= 0 ? 'green' : 'red'}">${solde >= 0 ? '+' : ''}${solde.toFixed(0)} €</strong>
      </div>
    `
  }).join('')

  $('#content').innerHTML = `
    <div class="section-header">
      <h2>💰 Budget — Historique</h2>
      <div class="section-header-actions">
        <div class="mois-nav">
          <button class="btn-icon" onclick="changerAnneeBudget(-1)">←</button>
          <strong>${budgetAnnee}</strong>
          <button class="btn-icon" onclick="changerAnneeBudget(1)">→</button>
        </div>
        <button class="btn-ghost" onclick="basculerVueBudget()">← Vue mensuelle</button>
      </div>
    </div>

    <div class="card">
      <div class="annee-row annee-head">
        <span class="annee-mois">Mois</span>
        <span>Revenus</span>
        <span>Dépenses</span>
        <span>Épargne</span>
        <span>Solde</span>
      </div>
      ${lignes}
      <div class="annee-row annee-total">
        <span class="annee-mois">Total ${budgetAnnee}</span>
        <span class="green">${cumRevenus.toFixed(0)} €</span>
        <span class="red">${cumDepenses.toFixed(0)} €</span>
        <span class="purple">${cumEpargne.toFixed(0)} €</span>
        <strong class="${cumSolde >= 0 ? 'green' : 'red'}">${cumSolde >= 0 ? '+' : ''}${cumSolde.toFixed(0)} €</strong>
      </div>
      <p class="muted small" style="margin-top:12px">Les charges fixes, abonnements et épargne actuels sont appliqués à chaque mois renseigné.</p>
    </div>
  `
}

// --- Sauvegardes budget ---
async function sauvegarderRevenus() {
  const data = { mois: budgetMois, annee: budgetAnnee }
  $$('.rev-input').forEach(i => data[i.dataset.field] = parseFloat(i.value) || 0)
  await db.from('budget_mois').upsert(data, { onConflict: 'mois,annee' })
  await chargerMoisBudget()
}

async function sauvegarderCharges() {
  for (const input of $$('.charge-input')) {
    await db.from('budget_charges_fixes').update({ montant: parseFloat(input.value) || 0 }).eq('id', input.dataset.id)
  }
  await initBudget()
}

async function ajouterVariable() {
  await db.from('budget_variables').insert({ mois: budgetMois, annee: budgetAnnee, label: 'Nouvelle dépense', montant: 0 })
  await chargerMoisBudget()
}

async function supprimerVariable(id) {
  await db.from('budget_variables').delete().eq('id', id)
  await chargerMoisBudget()
}

async function sauvegarderVariables() {
  for (const row of $$('.var-row')) {
    const id = row.querySelector('.var-label').dataset.id
    const label = row.querySelector('.var-label').value
    const montant = parseFloat(row.querySelector('.var-montant').value) || 0
    await db.from('budget_variables').update({ label, montant }).eq('id', id)
  }
  await chargerMoisBudget()
}

// =====================================================
// MODULE LEASING
// =====================================================
let leasingEditId = null
let currentLeasingId = null

async function initLeasing() {
  $('#content').innerHTML = '<p class="muted">Chargement…</p>'
  const [{ data: contrats }, { data: releves }] = await Promise.all([
    db.from('leasing').select('*').order('date_fin'),
    db.from('leasing_releves').select('*').order('date', { ascending: true }),
  ])
  renderLeasing(contrats || [], releves || [])
}

// Le km de départ d'un contrat = son premier relevé (pas 0)
function kmDepartContrat(contrat, releves) {
  const premiers = releves.filter(r => r.leasing_id === contrat.id)
  return premiers.length > 0 ? premiers[0].kilometrage : contrat.kilometrage_actuel
}

function renderLeasing(contrats, releves) {
  const today = new Date()

  $('#content').innerHTML = `
    <div class="section-header">
      <h2>🚗 Leasing & Crédits</h2>
    </div>
    <div class="leasing-grid">
      ${contrats.map(c => {
        const debut = new Date(c.date_debut)
        const fin = new Date(c.date_fin)
        const moisRestants = Math.max(0, Math.round((fin - today) / (JOUR_MS * 30)))
        const pctTemps = Math.min(100, Math.max(0, Math.round(((today - debut) / (fin - debut)) * 100)))
        const kmDepart = kmDepartContrat(c, releves)
        const kmParcourus = Math.max(0, c.kilometrage_actuel - kmDepart)
        const pctKm = c.kilometrage_max > 0 ? Math.min(100, Math.round((kmParcourus / c.kilometrage_max) * 100)) : 0
        const couleur = pctTemps > 80 ? '#FF6B6B' : pctTemps > 50 ? '#FFA500' : '#4CAF50'

        return `
          <div class="card leasing-card" onclick="ouvrirDetailLeasing('${c.id}')">
            <div class="leasing-header">
              <div>
                <h3>🚗 ${esc(c.vehicule)}</h3>
                <span class="leasing-nom">${esc(c.nom)}</span>
              </div>
              <div class="leasing-mensualite">${parseFloat(c.mensualite).toFixed(2)} €<span>/mois</span></div>
            </div>
            <div class="leasing-info-grid">
              <div class="leasing-info"><span>Fin</span><strong>${fin.toLocaleDateString('fr-FR')}</strong></div>
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
        <div class="form-group"><label>Mensualité (€)</label><input type="number" inputmode="decimal" id="l-mensualite" /></div>
        <div class="form-group"><label>Date début</label><input type="date" id="l-debut" /></div>
        <div class="form-group"><label>Date fin</label><input type="date" id="l-fin" /></div>
        <div class="form-group"><label>Km max</label><input type="number" inputmode="numeric" id="l-km-max" /></div>
        <div class="form-group"><label>Km actuels</label><input type="number" inputmode="numeric" id="l-km-actuel" /></div>
        <div class="form-group"><label>Notes</label><input type="text" id="l-notes" /></div>
        <div class="modal-actions">
          <button class="btn-ghost" onclick="fermerModal()">Annuler</button>
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
  const [{ data: c }, { data: releves }] = await Promise.all([
    db.from('leasing').select('*').eq('id', id).single(),
    db.from('leasing_releves').select('*').eq('leasing_id', id).order('date', { ascending: true }),
  ])
  if (!c) return

  const today = new Date()
  const debut = new Date(c.date_debut)
  const fin = new Date(c.date_fin)

  const totalJours = Math.round((fin - debut) / JOUR_MS)
  const joursEcoules = Math.max(0, Math.round((today - debut) / JOUR_MS))
  const joursRestants = Math.max(0, Math.round((fin - today) / JOUR_MS))
  const pctTemps = Math.min(100, Math.round((joursEcoules / totalJours) * 100))

  // Km de départ = premier relevé
  const kmDepart = releves && releves.length > 0 ? releves[0].kilometrage : c.kilometrage_actuel
  const kmParcourus = Math.max(0, c.kilometrage_actuel - kmDepart)
  const kmRestants = Math.max(0, c.kilometrage_max - kmParcourus)
  const pctKm = c.kilometrage_max > 0 ? Math.min(100, Math.round((kmParcourus / c.kilometrage_max) * 100)) : 0

  const kmIdealJour = totalJours > 0 ? c.kilometrage_max / totalJours : 0
  const kmReelJour = joursEcoules > 0 ? kmParcourus / joursEcoules : 0
  const kmAdaptatifJour = joursRestants > 0 ? kmRestants / joursRestants : 0
  const kmProjection = Math.round(kmParcourus + kmReelJour * joursRestants)
  const depassement = kmProjection - c.kilometrage_max

  const couleurTemps = pctTemps > 80 ? '#FF6B6B' : pctTemps > 50 ? '#FFA500' : '#4CAF50'
  const couleurKm = pctKm > 80 ? '#FF6B6B' : pctKm > 50 ? '#FFA500' : '#4F46E5'

  // Graphique SVG : km parcourus réels vs rythme idéal
  let graphique = ''
  if (releves && releves.length > 1) {
    const w = 500, h = 200, pad = 40
    const maxParcourus = Math.max(...releves.map(r => r.kilometrage - kmDepart))
    const yMax = Math.max(c.kilometrage_max, maxParcourus) * 1.05 || 1
    const tMin = debut.getTime()
    const tMax = fin.getTime()
    const tRange = tMax - tMin || 1

    const px = (t) => pad + ((t - tMin) / tRange) * (w - pad * 2)
    const py = (km) => h - pad - (km / yMax) * (h - pad * 2)

    const points = releves.map(r => `${px(new Date(r.date).getTime())},${py(r.kilometrage - kmDepart)}`).join(' ')

    graphique = `
      <svg viewBox="0 0 ${w} ${h}" class="leasing-graph">
        <line x1="${px(tMin)}" y1="${py(0)}" x2="${px(tMax)}" y2="${py(c.kilometrage_max)}"
          stroke="#666" stroke-width="1.5" stroke-dasharray="6,4"/>
        <polyline points="${points}" fill="none" stroke="#4F46E5" stroke-width="2.5" stroke-linejoin="round"/>
        ${releves.map(r => `<circle cx="${px(new Date(r.date).getTime())}" cy="${py(r.kilometrage - kmDepart)}" r="4" fill="#4F46E5"/>`).join('')}
      </svg>
    `
  }

  $('#detail-content').innerHTML = `
    <div class="detail-header">
      <button class="btn-back" onclick="fermerDetail()">← Retour</button>
      <div class="detail-titre">
        <h2>${esc(c.vehicule)}</h2>
        <span class="leasing-nom">${esc(c.nom)} · ${debut.toLocaleDateString('fr-FR')} → ${fin.toLocaleDateString('fr-FR')} · ${c.kilometrage_max.toLocaleString('fr-FR')} km</span>
      </div>
      <div class="detail-actions">
        <button class="btn-icon" onclick="editLeasing('${c.id}')">✏️</button>
        <button class="btn-icon" onclick="supprimerLeasing('${c.id}')">🗑️</button>
      </div>
    </div>

    ${depassement > 0 ? `<div class="alert-danger">⚠️ Dépassement prévu : +${depassement.toLocaleString('fr-FR')} km</div>` : ''}

    <div class="jauges-grid">
      <div class="card jauge-card">${svgJauge(pctKm, couleurKm)}<p>Km utilisés</p></div>
      <div class="card jauge-card">${svgJauge(pctTemps, couleurTemps)}<p>Temps écoulé</p></div>
    </div>

    <div class="stats-grid">
      <div class="card stat-card"><span>PARCOURUS</span><strong class="stat-value blue">${kmParcourus.toLocaleString('fr-FR')}</strong><small>sur ${c.kilometrage_max.toLocaleString('fr-FR')} km</small></div>
      <div class="card stat-card"><span>RESTANTS</span><strong class="stat-value purple">${kmRestants.toLocaleString('fr-FR')}</strong><small>${joursRestants} jours</small></div>
    </div>

    <div class="card rythme-card">
      <h4>RYTHME</h4>
      <div class="rythme-grid">
        <div><span>MOY/JOUR</span><strong class="orange">${kmReelJour.toFixed(1)}</strong><small>idéal : ${kmIdealJour.toFixed(1)}</small></div>
        <div><span>TENDANCE</span><strong class="${depassement > 0 ? 'red' : 'green'}">${kmAdaptatifJour.toFixed(1)}</strong><small>${depassement > 0 ? '↑ dépassement' : '↓ dans les clous'}</small></div>
      </div>
    </div>

    <div class="card budget-adapt-card">
      <h4>BUDGET ADAPTATIF</h4>
      <p class="adapt-subtitle">Ce que vous pouvez encore rouler :</p>
      <div class="adapt-grid">
        <div><span>PAR JOUR</span><strong class="blue">${kmAdaptatifJour.toFixed(1)}</strong><small>km/jour</small></div>
        <div><span>PAR SEM.</span><strong class="blue">${(kmAdaptatifJour * 7).toFixed(0)}</strong><small>km/sem</small></div>
        <div><span>PAR MOIS</span><strong class="blue">${(kmAdaptatifJour * 30).toFixed(0)}</strong><small>km/mois</small></div>
      </div>
    </div>

    <div class="card projection-card">
      <h4>PROJECTION FIN DE CONTRAT</h4>
      <div class="projection-row"><span>Km projetés</span><strong class="${depassement > 0 ? 'red' : 'green'}">${kmProjection.toLocaleString('fr-FR')}</strong></div>
      <div class="projection-row"><span>${depassement > 0 ? 'Dépassement' : 'Marge'}</span><strong class="${depassement > 0 ? 'red' : 'green'}">${depassement > 0 ? '+' : ''}${depassement.toLocaleString('fr-FR')} km</strong></div>
    </div>

    ${releves && releves.length > 1 ? `
    <div class="card">
      <h4>Évolution — Km parcourus vs rythme idéal</h4>
      <div style="margin-top:16px">${graphique}</div>
      <div class="graph-legende"><span>— Réel</span><span style="color:#666">- - Idéal</span></div>
    </div>` : ''}

    <div class="card">
      <div class="card-head-flex">
        <h4>Relevés kilométriques</h4>
        <button class="btn-primary btn-small" onclick="ajouterReleve('${c.id}')">+ Relevé</button>
      </div>
      ${releves && releves.length > 0 ? releves.slice().reverse().map((r, i, arr) => {
        const prev = arr[i + 1]
        const diff = prev ? r.kilometrage - prev.kilometrage : null
        const jours = prev ? Math.round((new Date(r.date) - new Date(prev.date)) / JOUR_MS) : null
        return `
          <div class="releve-row">
            <div><strong>${r.kilometrage.toLocaleString('fr-FR')} km</strong><small>${new Date(r.date).toLocaleDateString('fr-FR')}</small></div>
            <div class="releve-diff">
              ${diff !== null ? `<strong class="blue">+${diff} km</strong><small>${jours > 0 ? (diff / jours).toFixed(1) : '—'} km/j sur ${jours}j</small>` : '<small>Premier relevé (km de départ)</small>'}
            </div>
            <button class="btn-delete" onclick="supprimerReleve('${r.id}', '${c.id}')">✕</button>
          </div>
        `
      }).join('') : '<p class="muted" style="font-style:italic">Aucun relevé pour l\'instant. Le premier relevé définit le kilométrage de départ.</p>'}
    </div>

    <!-- MODAL RELEVÉ -->
    <div id="releve-modal" class="modal hidden">
      <div class="modal-card" style="max-width:360px">
        <h3>Nouveau relevé</h3>
        <p class="muted small">Entrez le compteur kilométrique</p>
        <div class="form-group"><label>Date</label><input type="date" id="r-date" /></div>
        <div class="form-group"><label>Compteur (km)</label><input type="number" inputmode="numeric" id="r-km" placeholder="ex: 1 250" /></div>
        <div class="modal-actions">
          <button class="btn-ghost" onclick="fermerReleveModal()">Annuler</button>
          <button class="btn-primary" onclick="sauvegarderReleve()">Enregistrer</button>
        </div>
      </div>
    </div>
  `

  $('#leasing-detail').classList.remove('hidden')
}

function svgJauge(pct, couleur) {
  const r = 45, cx = 60, cy = 60
  const circonference = 2 * Math.PI * r
  const offset = circonference - (pct / 100) * circonference
  return `
    <svg viewBox="0 0 120 120" class="jauge-svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${couleur}" stroke-width="10"
        stroke-dasharray="${circonference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
        fill="var(--text)" font-size="18" font-weight="bold">${pct}%</text>
    </svg>
  `
}

function ajouterReleve(leasingId) {
  currentLeasingId = leasingId
  $('#r-date').value = new Date().toISOString().split('T')[0]
  $('#r-km').value = ''
  $('#releve-modal').classList.remove('hidden')
}

function fermerReleveModal() {
  $('#releve-modal').classList.add('hidden')
}

async function sauvegarderReleve() {
  const km = parseInt($('#r-km').value)
  const date = $('#r-date').value
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
  $('#leasing-detail').classList.add('hidden')
}

function ajouterLeasing() {
  leasingEditId = null
  $('#modal-title').textContent = 'Nouveau contrat'
  $$('#leasing-modal input').forEach(i => i.value = '')
  $('#leasing-modal').classList.remove('hidden')
}

async function editLeasing(id) {
  const { data } = await db.from('leasing').select('*').eq('id', id).single()
  if (!data) return
  leasingEditId = id
  $('#modal-title').textContent = 'Modifier le contrat'
  $('#l-nom').value = data.nom || ''
  $('#l-vehicule').value = data.vehicule || ''
  $('#l-mensualite').value = data.mensualite
  $('#l-debut').value = data.date_debut
  $('#l-fin').value = data.date_fin
  $('#l-km-max').value = data.kilometrage_max
  $('#l-km-actuel').value = data.kilometrage_actuel
  $('#l-notes').value = data.notes || ''
  $('#leasing-modal').classList.remove('hidden')
}

function fermerModal() {
  $('#leasing-modal').classList.add('hidden')
}

async function sauvegarderLeasing() {
  const data = {
    nom: $('#l-nom').value,
    vehicule: $('#l-vehicule').value,
    mensualite: parseFloat($('#l-mensualite').value) || 0,
    date_debut: $('#l-debut').value,
    date_fin: $('#l-fin').value,
    kilometrage_max: parseInt($('#l-km-max').value) || 0,
    kilometrage_actuel: parseInt($('#l-km-actuel').value) || 0,
    notes: $('#l-notes').value,
  }

  if (leasingEditId) {
    await db.from('leasing').update(data).eq('id', leasingEditId)
  } else {
    await db.from('leasing').insert(data)
  }

  fermerModal()
  fermerDetail()
  initLeasing()
}

async function supprimerLeasing(id) {
  if (!confirm('Supprimer ce contrat et tous ses relevés ?')) return
  await db.from('leasing_releves').delete().eq('leasing_id', id)
  await db.from('leasing').delete().eq('id', id)
  fermerDetail()
  initLeasing()
}

// =====================================================
// MODULE TIER LIST
// =====================================================
const NIVEAUX_DEFAUT = [
  { nom: 'S', couleur: '#FF7F7F' },
  { nom: 'A', couleur: '#FFBF7F' },
  { nom: 'B', couleur: '#FFDF7F' },
  { nom: 'C', couleur: '#BFFF7F' },
  { nom: 'D', couleur: '#7FBFFF' },
]

const AUTEURS = [
  { id: 'wesley', label: 'Wesley', couleur: '#4F46E5' },
  { id: 'lauriane', label: 'Lauriane', couleur: '#EC4899' },
]

// État du module tier list
let tlState = null // { id, nom, niveaux, items, votes, auteur }
let tlNiveauxDraft = []
let tlNiveauxSupprimes = []

async function initTierlist() {
  tlState = null
  $('#content').innerHTML = '<p class="muted">Chargement…</p>'
  const { data, error } = await db.from('tierlist').select('*').order('created_at', { ascending: true })

  if (error) {
    $('#content').innerHTML = `
      <div class="section-header"><h2>🏆 Tier List</h2></div>
      <div class="card"><p class="muted">Les tables tier list n'existent pas encore dans Supabase.<br>
      Exécutez le fichier <code>supabase/tierlist.sql</code> dans l'éditeur SQL de Supabase, puis rechargez.</p></div>
    `
    return
  }

  const listes = data || []
  $('#content').innerHTML = `
    <div class="section-header"><h2>🏆 Tier List</h2></div>
    <div class="tierlist-grid">
      ${listes.map(t => `
        <div class="card tierlist-card" onclick="ouvrirTierlist('${t.id}')">
          <h3>🏆 ${esc(t.nom)}</h3>
          <p class="muted small">Créée le ${new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
          <p class="leasing-tap-hint">Ouvrir →</p>
        </div>
      `).join('')}
      <div class="card leasing-add" onclick="creerTierlist()">
        <div class="leasing-add-inner"><span>+</span><p>Nouvelle tier list</p></div>
      </div>
    </div>
  `
}

async function creerTierlist() {
  const nom = prompt('Nom de la tier list (ex: Chips, Glaces, Restos…)')
  if (!nom || !nom.trim()) return
  const { data: tl } = await db.from('tierlist').insert({ nom: nom.trim() }).select().single()
  if (!tl) return
  await db.from('tierlist_niveaux').insert(
    NIVEAUX_DEFAUT.map((n, i) => ({ tierlist_id: tl.id, nom: n.nom, couleur: n.couleur, ordre: i }))
  )
  ouvrirTierlist(tl.id)
}

async function ouvrirTierlist(id) {
  $('#content').innerHTML = '<p class="muted">Chargement…</p>'
  const [{ data: tl }, { data: niveaux }, { data: items }] = await Promise.all([
    db.from('tierlist').select('*').eq('id', id).single(),
    db.from('tierlist_niveaux').select('*').eq('tierlist_id', id).order('ordre', { ascending: true }),
    db.from('tierlist_items').select('*').eq('tierlist_id', id).order('created_at', { ascending: true }),
  ])
  if (!tl) return initTierlist()

  const itemIds = (items || []).map(i => i.id)
  let votes = []
  if (itemIds.length > 0) {
    const { data: v } = await db.from('tierlist_votes').select('*').in('item_id', itemIds)
    votes = v || []
  }

  tlState = {
    id: tl.id,
    nom: tl.nom,
    niveaux: niveaux || [],
    items: items || [],
    votes,
    auteur: tlState && tlState.id === tl.id ? tlState.auteur : 'wesley',
  }
  renderTierlistDetail()
}

function tlChangerAuteur(auteur) {
  tlState.auteur = auteur
  renderTierlistDetail()
}

function tlVoteDe(itemId, auteur) {
  return tlState.votes.find(v => v.item_id === itemId && v.auteur === auteur)
}

function tlChipHtml(item, opts = {}) {
  const drag = opts.draggable
    ? `draggable="true" ondragstart="tlDragStart(event, '${item.id}')"`
    : ''
  const click = opts.clickable ? `onclick="tlChoisirNiveau('${item.id}')"` : ''
  return `<span class="tl-chip" ${drag} ${click} title="${esc(item.label)}">${esc(item.label)}</span>`
}

function renderTierlistDetail() {
  const { nom, niveaux, items, auteur } = tlState
  const duo = auteur === 'duo'

  let corps = ''
  if (!duo) {
    // Vue d'un auteur : lignes de niveaux + zone "à classer", drag & drop + tap
    const pool = items.filter(it => !tlVoteDe(it.id, auteur))
    corps = `
      <div class="tl-rows">
        ${niveaux.map(n => {
          const dansNiveau = items.filter(it => tlVoteDe(it.id, auteur)?.niveau_id === n.id)
          return `
            <div class="tl-row">
              <div class="tl-row-label" style="background:${esc(n.couleur)}">${esc(n.nom)}</div>
              <div class="tl-row-zone" ondragover="event.preventDefault()" ondrop="tlDrop(event, '${n.id}')">
                ${dansNiveau.map(it => tlChipHtml(it, { draggable: true, clickable: true })).join('')}
              </div>
            </div>
          `
        }).join('')}
      </div>

      <div class="card tl-pool" ondragover="event.preventDefault()" ondrop="tlDrop(event, '')">
        <h4>📦 À classer (${pool.length})</h4>
        <div class="tl-pool-zone">
          ${pool.map(it => tlChipHtml(it, { draggable: true, clickable: true })).join('') || '<p class="muted small">Tout est classé ! Glissez un item ici pour le déclasser.</p>'}
        </div>
        <div class="tl-add-row">
          <input type="text" id="tl-nouvel-item" placeholder="Nouvel item (ex: Lay's nature)" onkeydown="if(event.key==='Enter')tlAjouterItem()" />
          <button class="btn-primary" onclick="tlAjouterItem()">+ Ajouter</button>
        </div>
        <p class="muted small">Glissez-déposez un item dans un niveau, ou appuyez dessus pour choisir.</p>
      </div>
    `
  } else {
    // Vue côte à côte : les deux avis en colonnes
    corps = `
      <div class="tl-duo-grid">
        ${AUTEURS.map(a => `
          <div class="card tl-duo-col">
            <h4 style="color:${a.couleur}">${a.label}</h4>
            ${niveaux.map(n => {
              const dansNiveau = items.filter(it => tlVoteDe(it.id, a.id)?.niveau_id === n.id)
              return `
                <div class="tl-row tl-row-mini">
                  <div class="tl-row-label" style="background:${esc(n.couleur)}">${esc(n.nom)}</div>
                  <div class="tl-row-zone">${dansNiveau.map(it => tlChipHtml(it)).join('') || '<span class="muted small">—</span>'}</div>
                </div>
              `
            }).join('')}
            <p class="muted small">Non classés : ${items.filter(it => !tlVoteDe(it.id, a.id)).length}</p>
          </div>
        `).join('')}
      </div>
    `
  }

  $('#content').innerHTML = `
    <div class="detail-header">
      <button class="btn-back" onclick="initTierlist()">← Retour</button>
      <div class="detail-titre"><h2>🏆 ${esc(nom)}</h2></div>
      <div class="detail-actions">
        <button class="btn-icon" title="Renommer" onclick="tlRenommer()">✏️</button>
        <button class="btn-icon" title="Niveaux" onclick="tlOuvrirNiveaux()">⚙️</button>
        <button class="btn-icon" title="Supprimer" onclick="tlSupprimerListe()">🗑️</button>
      </div>
    </div>

    <div class="tl-auteurs">
      ${AUTEURS.map(a => `
        <button class="tl-auteur-btn ${auteur === a.id ? 'active' : ''}" style="--auteur:${a.couleur}"
          onclick="tlChangerAuteur('${a.id}')">${a.label}</button>
      `).join('')}
      <button class="tl-auteur-btn ${duo ? 'active' : ''}" style="--auteur:#10B981"
        onclick="tlChangerAuteur('duo')">👀 Côte à côte</button>
    </div>

    ${corps}

    <!-- MODAL CHOIX NIVEAU (tap mobile) -->
    <div id="tl-choix-modal" class="modal hidden">
      <div class="modal-card" style="max-width:360px">
        <div id="tl-choix-content"></div>
      </div>
    </div>

    <!-- MODAL NIVEAUX -->
    <div id="tl-niveaux-modal" class="modal hidden">
      <div class="modal-card">
        <div id="tl-niveaux-content"></div>
      </div>
    </div>
  `
}

// --- Drag & drop ---
function tlDragStart(ev, itemId) {
  ev.dataTransfer.setData('text/plain', itemId)
  ev.dataTransfer.effectAllowed = 'move'
}

function tlDrop(ev, niveauId) {
  ev.preventDefault()
  const itemId = ev.dataTransfer.getData('text/plain')
  if (itemId) tlVoter(itemId, niveauId || null)
}

// --- Vote ---
async function tlVoter(itemId, niveauId) {
  const auteur = tlState.auteur
  if (auteur === 'duo') return

  if (!niveauId) {
    await db.from('tierlist_votes').delete().eq('item_id', itemId).eq('auteur', auteur)
    tlState.votes = tlState.votes.filter(v => !(v.item_id === itemId && v.auteur === auteur))
  } else {
    const { data } = await db.from('tierlist_votes')
      .upsert({ item_id: itemId, auteur, niveau_id: niveauId }, { onConflict: 'item_id,auteur' })
      .select().single()
    tlState.votes = tlState.votes.filter(v => !(v.item_id === itemId && v.auteur === auteur))
    if (data) tlState.votes.push(data)
  }
  renderTierlistDetail()
}

// --- Tap pour choisir un niveau (mobile) ---
function tlChoisirNiveau(itemId) {
  if (tlState.auteur === 'duo') return
  const item = tlState.items.find(i => i.id === itemId)
  if (!item) return
  $('#tl-choix-content').innerHTML = `
    <h3>${esc(item.label)}</h3>
    <p class="muted small">Classer pour ${AUTEURS.find(a => a.id === tlState.auteur).label} :</p>
    <div class="tl-choix-niveaux">
      ${tlState.niveaux.map(n => `
        <button class="tl-choix-btn" style="background:${esc(n.couleur)}" onclick="tlVoteEtFerme('${itemId}', '${n.id}')">${esc(n.nom)}</button>
      `).join('')}
      <button class="tl-choix-btn tl-choix-neutre" onclick="tlVoteEtFerme('${itemId}', '')">📦 Non classé</button>
    </div>
    <div class="modal-actions">
      <button class="btn-delete-text" onclick="tlSupprimerItem('${itemId}')">🗑️ Supprimer l'item</button>
      <button class="btn-ghost" onclick="tlFermerChoix()">Annuler</button>
    </div>
  `
  $('#tl-choix-modal').classList.remove('hidden')
}

function tlFermerChoix() {
  $('#tl-choix-modal').classList.add('hidden')
}

async function tlVoteEtFerme(itemId, niveauId) {
  tlFermerChoix()
  await tlVoter(itemId, niveauId || null)
}

// --- Items ---
async function tlAjouterItem() {
  const input = $('#tl-nouvel-item')
  const label = input.value.trim()
  if (!label) return
  const { data } = await db.from('tierlist_items').insert({ tierlist_id: tlState.id, label }).select().single()
  if (data) tlState.items.push(data)
  renderTierlistDetail()
  const newInput = $('#tl-nouvel-item')
  if (newInput) newInput.focus()
}

async function tlSupprimerItem(itemId) {
  if (!confirm('Supprimer cet item (et les votes associés) ?')) return
  tlFermerChoix()
  await db.from('tierlist_votes').delete().eq('item_id', itemId)
  await db.from('tierlist_items').delete().eq('id', itemId)
  tlState.items = tlState.items.filter(i => i.id !== itemId)
  tlState.votes = tlState.votes.filter(v => v.item_id !== itemId)
  renderTierlistDetail()
}

// --- Liste ---
async function tlRenommer() {
  const nom = prompt('Nouveau nom :', tlState.nom)
  if (!nom || !nom.trim()) return
  await db.from('tierlist').update({ nom: nom.trim() }).eq('id', tlState.id)
  tlState.nom = nom.trim()
  renderTierlistDetail()
}

async function tlSupprimerListe() {
  if (!confirm(`Supprimer la tier list « ${tlState.nom} » et tout son contenu ?`)) return
  await db.from('tierlist').delete().eq('id', tlState.id)
  initTierlist()
}

// --- Éditeur de niveaux ---
function tlOuvrirNiveaux() {
  tlNiveauxDraft = tlState.niveaux.map(n => ({ ...n }))
  tlNiveauxSupprimes = []
  tlRenderNiveauxModal()
  $('#tl-niveaux-modal').classList.remove('hidden')
}

function tlRenderNiveauxModal() {
  $('#tl-niveaux-content').innerHTML = `
    <h3>⚙️ Niveaux</h3>
    <p class="muted small">Nom, couleur et ordre des niveaux.</p>
    ${tlNiveauxDraft.map((n, i) => `
      <div class="tl-niveau-edit">
        <input type="color" value="${esc(n.couleur)}" onchange="tlNiveauChange(${i}, 'couleur', this.value)" />
        <input type="text" value="${esc(n.nom)}" oninput="tlNiveauChange(${i}, 'nom', this.value)" />
        <button class="btn-icon" ${i === 0 ? 'disabled' : ''} onclick="tlNiveauDeplacer(${i}, -1)">↑</button>
        <button class="btn-icon" ${i === tlNiveauxDraft.length - 1 ? 'disabled' : ''} onclick="tlNiveauDeplacer(${i}, 1)">↓</button>
        <button class="btn-delete" onclick="tlNiveauRetirer(${i})">✕</button>
      </div>
    `).join('')}
    <button class="btn-add" onclick="tlNiveauAjouter()">+ Ajouter un niveau</button>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="tlFermerNiveaux()">Annuler</button>
      <button class="btn-primary" onclick="tlSauvegarderNiveaux()">💾 Sauvegarder</button>
    </div>
  `
}

function tlNiveauChange(i, champ, valeur) {
  tlNiveauxDraft[i][champ] = valeur
}

function tlNiveauDeplacer(i, delta) {
  const j = i + delta
  if (j < 0 || j >= tlNiveauxDraft.length) return
  ;[tlNiveauxDraft[i], tlNiveauxDraft[j]] = [tlNiveauxDraft[j], tlNiveauxDraft[i]]
  tlRenderNiveauxModal()
}

function tlNiveauAjouter() {
  tlNiveauxDraft.push({ nom: 'Nouveau', couleur: '#AAAAAA' })
  tlRenderNiveauxModal()
}

function tlNiveauRetirer(i) {
  const n = tlNiveauxDraft[i]
  if (n.id) tlNiveauxSupprimes.push(n.id)
  tlNiveauxDraft.splice(i, 1)
  tlRenderNiveauxModal()
}

function tlFermerNiveaux() {
  $('#tl-niveaux-modal').classList.add('hidden')
}

async function tlSauvegarderNiveaux() {
  for (const id of tlNiveauxSupprimes) {
    await db.from('tierlist_votes').delete().eq('niveau_id', id)
    await db.from('tierlist_niveaux').delete().eq('id', id)
  }
  for (let i = 0; i < tlNiveauxDraft.length; i++) {
    const n = tlNiveauxDraft[i]
    if (n.id) {
      await db.from('tierlist_niveaux').update({ nom: n.nom, couleur: n.couleur, ordre: i }).eq('id', n.id)
    } else {
      await db.from('tierlist_niveaux').insert({ tierlist_id: tlState.id, nom: n.nom, couleur: n.couleur, ordre: i })
    }
  }
  tlFermerNiveaux()
  ouvrirTierlist(tlState.id)
}

// =====================================================
// DÉMARRAGE
// =====================================================
renderNav()

db.auth.getSession().then(({ data: { session } }) => {
  if (session) showDashboard()
})
