import { drawDefaultAvatar, ditherUploadedImage } from './ditherer.js';

// --- SYSTEM STATE & CONFIGS ---
const THEMES = ['kodak-gold', 'cyanotype', 'matrix-green', 'classic-bw'];
let currentThemeIndex = 0;
let userUploadedImage = null; // Stores uploaded Image object for theme-redrawing
let isMuted = false;

// Web Audio API Context
let audioCtx = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAudio();
  initAvatar();
  initRegisterNavigation();
  initKeyboardShortcuts();
  startSystemStats();
});

// --- AUDIO SYSTEM (Web Audio Synthesis) ---
function initAudio() {
  const muteBtn = document.getElementById('btn-mute');
  const storedMute = localStorage.getItem('retro_mute');
  
  if (storedMute === 'true') {
    isMuted = true;
    muteBtn.setAttribute('aria-pressed', 'true');
    muteBtn.textContent = 'UNMUTE AUDIO';
  }

  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem('retro_mute', isMuted ? 'true' : 'false');
    muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
    muteBtn.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
    
    if (!isMuted) {
      playBeep(800, 0.08); // play quick test beep
    }
  });

  // BIOS startup beep on first interaction (due to browser autoplay policies)
  const playStartupSound = () => {
    playBeep(900, 0.15);
    setTimeout(() => playBeep(1200, 0.1), 180);
    document.removeEventListener('click', playStartupSound);
    document.removeEventListener('keydown', playStartupSound);
  };
  document.addEventListener('click', playStartupSound);
  document.addEventListener('keydown', playStartupSound);
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play retro synthesized beep
function playBeep(frequency, duration) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Retro square wave for authentic terminal sound, or sine wave
    osc.type = 'sine';
    osc.frequency.value = frequency;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.error('Audio failed: ', e);
  }
}

// Play typewriter-style mechanical key click
function playKeyClick() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // High frequency noise burst
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}

// --- THEME ENGINE ---
function initTheme() {
  const savedTheme = localStorage.getItem('retro_theme');
  if (savedTheme && THEMES.includes(savedTheme)) {
    currentThemeIndex = THEMES.indexOf(savedTheme);
  } else {
    currentThemeIndex = 0; // Default: kodak-gold
  }
  
  applyTheme(THEMES[currentThemeIndex]);

  const themeBtn = document.getElementById('btn-theme');
  themeBtn.addEventListener('click', cycleTheme);
}

function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('retro_theme', themeName);
  
  // Update dithered canvas layout colors to match active theme
  redrawAvatar();
}

function cycleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  applyTheme(THEMES[currentThemeIndex]);
  playBeep(450, 0.06);
}

// --- AVATAR & DITHER MANAGEMENT ---
function initAvatar() {
  const avatarContainer = document.querySelector('.avatar-container');
  const fileInput = document.getElementById('photo-upload');

  // Load profile.jpg on startup; fallback to procedural avatar if it fails
  const img = new Image();
  img.onload = () => {
    userUploadedImage = img;
    redrawAvatar();
  };
  img.onerror = () => {
    redrawAvatar();
  };
  img.src = 'profile.jpg';

  // Click container to upload
  avatarContainer.addEventListener('click', () => {
    fileInput.click();
    playBeep(600, 0.05);
  });

  // Handle keyboard interaction (Enter/Space to upload)
  avatarContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
      playBeep(600, 0.05);
    }
  });

  // Load selected photo
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Play loading sounds
    playBeep(300, 0.1);
    setTimeout(() => playBeep(500, 0.1), 100);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        userUploadedImage = img; // Save to state
        redrawAvatar();
        playBeep(800, 0.15); // play success sound
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function redrawAvatar() {
  const canvas = document.getElementById('avatar-canvas');
  if (!canvas) return;

  if (userUploadedImage) {
    ditherUploadedImage(canvas, userUploadedImage);
  } else {
    drawDefaultAvatar(canvas);
  }
}

// --- REGISTERS NAVIGATION ---
function initRegisterNavigation() {
  const buttons = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.register-view');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchRegister(targetId);
    });
  });
}

function switchRegister(targetId) {
  const buttons = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.register-view');
  const targetView = document.getElementById(targetId);

  if (!targetView || targetView.classList.contains('active')) return;

  playBeep(700, 0.04);

  // Deactivate all
  buttons.forEach(b => b.classList.remove('active'));
  views.forEach(v => v.classList.remove('active'));

  // Activate target view
  targetView.classList.add('active');
  
  // Activate matching button
  const matchingBtn = Array.from(buttons).find(b => b.getAttribute('data-target') === targetId);
  if (matchingBtn) matchingBtn.classList.add('active');
}

// --- KEYBOARD SHORTCUTS CONTROLLER ---
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Intercept clicks to mechanical clack
    playKeyClick();

    // Check if Ctrl key is pressed
    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      
      switch (key) {
        case 'h':
        case 'm': // Ctrl + H or Ctrl + M (Home Register)
          e.preventDefault();
          switchRegister('reg-home');
          break;
        case 'b': // Ctrl + B (Biography Register)
          e.preventDefault();
          switchRegister('reg-bio');
          break;
        case 'p': // Ctrl + P (Projects Register)
          e.preventDefault();
          switchRegister('reg-projects');
          break;
        case 's': // Ctrl + S (Services Register)
          e.preventDefault();
          switchRegister('reg-services');
          break;
        case 'i': // Ctrl + I (Cycle Theme)
          e.preventDefault();
          cycleTheme();
          break;
        default:
          break;
      }
    }
  });
}

// --- LIVE SYSTEM REGISTRY STATS ---
function startSystemStats() {
  // 1. Local Time Clock
  const clockEl = document.getElementById('sys-clock');
  const updateClock = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hh}:${mm}:${ss}`;
  };
  updateClock();
  setInterval(updateClock, 1000);

  // 2. CPU Intensity Simulator
  const cpuEl = document.getElementById('cpu-load');
  setInterval(() => {
    if (cpuEl) {
      // Simulate active system fluctuations
      const load = (Math.random() * 6.5 + 2.1).toFixed(1);
      cpuEl.textContent = `${load.padStart(4, '0')}%`;
    }
  }, 2000);

  // 3. Detect Client Node Info
  const nodeEl = document.getElementById('client-node');
  if (nodeEl) {
    const ua = navigator.userAgent;
    let browser = 'UNKNOWN';
    let os = 'GENERIC';

    if (ua.includes('Chrome')) browser = 'CHROME';
    else if (ua.includes('Safari')) browser = 'SAFARI';
    else if (ua.includes('Firefox')) browser = 'FIREFOX';
    else if (ua.includes('Edge')) browser = 'EDGE';

    if (ua.includes('Windows')) os = 'WIN_NT';
    else if (ua.includes('Macintosh')) os = 'OS_X';
    else if (ua.includes('Linux')) os = 'LINUX';
    else if (ua.includes('Android')) os = 'ANDROID';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'IOS_NODE';

    nodeEl.textContent = `${browser} / ${os}`;
  }
}
