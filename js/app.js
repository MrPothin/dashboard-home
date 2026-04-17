// ===== CONFIGURATION SUPABASE =====
// Remplace ces deux valeurs par celles de ton projet Supabase
const SUPABASE_URL = 'https://fwnzesnicmzjqkvbjspr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bnplc25pY216anFrdmJqc3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzE1MzgsImV4cCI6MjA5MTk0NzUzOH0.vGtVxpIrVa4MViPBdk5B6MX-xdMzfVsB9M8N2qCAAas'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== ÉLÉMENTS =====
const pageLogin = document.getElementById('page-login')
const pageDashboard = document.getElementById('page-dashboard')
const btnLogin = document.getElementById('btn-login')
const btnLogout = document.getElementById('btn-logout')
const btnTheme = document.getElementById('btn-theme')
const loginError = document.getElementById('login-error')

// ===== THÈME =====
// Charge le thème sauvegardé ou dark par défaut
const savedTheme = localStorage.getItem('theme') || 'dark'
document.body.className = savedTheme

btnTheme.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark')
  const newTheme = isDark ? 'light' : 'dark'
  document.body.className = newTheme
  localStorage.setItem('theme', newTheme)
  btnTheme.textContent = newTheme === 'dark' ? '🌙 Thème' : '☀️ Thème'
})

// ===== NAVIGATION =====
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const target = link.dataset.page

    // Mise à jour des liens
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    link.classList.add('active')

    // Mise à jour des sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.getElementById('section-' + target).classList.add('active')
  })
})

// ===== AUTHENTIFICATION =====
function showDashboard() {
  pageLogin.classList.remove('active')
  pageDashboard.classList.add('active')
}

function showLogin() {
  pageDashboard.classList.remove('active')
  pageLogin.classList.add('active')
}

// Connexion
btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  loginError.textContent = ''

  const { data, error } = await db.auth.signInWithPassword({ email, password })
  console.log('data:', data)
  console.log('error:', error)
  
  if (error) {
    loginError.textContent = error.message
  } else {
    showDashboard()
  }
})

// Déconnexion
btnLogout.addEventListener('click', async () => {
  await db.auth.signOut()
  showLogin()
})

// Vérification session au chargement
db.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    showDashboard()
  }
})