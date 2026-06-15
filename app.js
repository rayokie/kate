// app.js - PART 1

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCc-WbZc_MDJgYmDCUDShurrewhlNvSJTM",
  authDomain: "kate-b36b6.firebaseapp.com",
  projectId: "kate-b36b6",
  storageBucket: "kate-b36b6.firebasestorage.app",
  messagingSenderId: "974522377234",
  appId: "1:974522377234:web:8e281206f00aa9aa02a4cb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
    if (event.keyCode === 123 || (event.ctrlKey && event.shiftKey && event.keyCode === 73)) {
        event.preventDefault();
    }
});

let currentUser = "";
let currentPlayingMedia = null; 
let modalCallback = null;       

// 1. SECURE AUTO-LOGIN: Firebase handles the session memory now, NOT localStorage
document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        setTimeout(() => {
            document.getElementById('splashScreen').classList.add('hidden');
            if (user) {
                // If Firebase confirms they have an active secure session, let them in
                executeLogin(user.email);
            }
        }, 1800);
    });
});

// 2. UNIVERSAL CUSTOM MODAL SYSTEM
function showCustomModal({ title, message, type='alert', inputDefault='', confirmText='OK', confirmIcon='' }) {
    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    
    const inputEl = document.getElementById('modalInput');
    if (type === 'prompt') {
        inputEl.style.display = 'block';
        inputEl.value = inputDefault;
        inputEl.focus();
    } else {
        inputEl.style.display = 'none';
    }

    const confirmBtn = document.getElementById('modalConfirmBtn');
    confirmBtn.innerHTML = confirmIcon ? `<i class="${confirmIcon}"></i> ${confirmText}` : confirmText;

    return new Promise((resolve) => {
        modalCallback = resolve;
    });
}

window.closeModalAction = function(isConfirm) {
    document.getElementById('customModal').classList.add('hidden');
    if (modalCallback) {
        if (isConfirm) {
            const inputEl = document.getElementById('modalInput');
            modalCallback(inputEl.style.display === 'block' ? inputEl.value : true);
        } else {
            modalCallback(null);
        }
        modalCallback = null;
    }
}

// 3. LOGIN & LOGOUT SYSTEM
window.togglePassword = function() {
    const passInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleIcon.classList.replace('ph-eye', 'ph-eye-slash');
    } else {
        passInput.type = 'password';
        toggleIcon.classList.replace('ph-eye-slash', 'ph-eye');
    }
}

let notesDB = { admin: "", kate: "" };
let currentNoteView = ""; 
let unreadNotes = { admin: false, kate: false }; 
const avatars = {
    admin: "linear-gradient(45deg, #3A1C71, #D4AF37)",
    kate: "linear-gradient(45deg, #7FB5FF, #3A1C71)"
};

// THE REAL FIREBASE SECURITY LOCK (NO MORE BYPASS)
window.attemptLogin = async function() {
    const email = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('loginError');

    if (!email || !pass) {
        errorMsg.innerText = "Please enter your credentials.";
        return;
    }

    errorMsg.innerText = "Authenticating securely...";

    try {
        // This physically asks the Firebase server if the credentials are real
        await signInWithEmailAndPassword(auth, email, pass);
        
        // Clear input boxes for security
        document.getElementById('username').value = "";
        document.getElementById('password').value = "";
        errorMsg.innerText = "";
        
        // Note: We don't call executeLogin here. 
        // The onAuthStateChanged listener at the top detects the login and fires automatically.
    } catch (error) {
        errorMsg.innerText = "Access Denied. Invalid credentials.";
        console.error(error);
    }
}

function executeLogin(userEmail) {
    currentUser = userEmail;
    
    // 🔥 PUT YOUR CUSTOM FIREBASE EMAIL INSIDE THESE QUOTES 🔥
    const MY_ADMIN_EMAIL = "mdrayeesulislam206@gmail.com"; 
    
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appInterface').style.display = 'block';

    if (userEmail === MY_ADMIN_EMAIL) {
        currentNoteView = 'admin'; 
        document.querySelectorAll('.admin-only').forEach(el => {
            if (el.tagName === 'BUTTON') el.style.display = 'flex';
            else el.style.display = 'inline-block';
        });
    } else {
        currentNoteView = 'kate'; 
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }

    updateNoteUI();
    simulateLoading();
}

window.logoutApp = async function() {
    const confirm = await showCustomModal({
        title: "Disconnect",
        message: "Are you sure you want to log out of the terminal?",
        type: "confirm",
        confirmText: "Log Out",
        confirmIcon: "ph-bold ph-sign-out"
    });

    if (confirm) {
        await signOut(auth); // Physically terminate the Firebase session
        currentUser = "";
        document.getElementById('appInterface').style.display = 'none';
        document.getElementById('loginScreen').classList.remove('hidden');
    }
}

// 4. REFRESH APP
window.refreshFeed = function(btnElement) {
    const icon = btnElement.querySelector('i');
    icon.classList.add('spin-anim'); 
    
    document.getElementById('postFeed').style.display = 'none';
    document.getElementById('skeletonFeed').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('skeletonFeed').style.display = 'none';
        document.getElementById('postFeed').style.display = 'block';
        icon.classList.remove('spin-anim'); 
        
        const posts = document.querySelectorAll('.post');
        posts.forEach(post => {
            post.classList.add('hidden-scroll');
            observer.observe(post);
        });
    }, 1500); 
}

// 5. TWO-WAY NOTE SYSTEM & DELETE SYSTEM
function updateNoteUI() {
    const noteEl = document.getElementById('quickNoteText');
    const avatarEl = document.getElementById('otherNoteAvatar');
    const dotEl = document.getElementById('noteUpdateDot');
    
    let otherUser = currentNoteView === 'admin' ? 'kate' : 'admin';
    let textToShow = notesDB[currentNoteView];
    
    if (!textToShow || textToShow === "") {
        noteEl.innerText = currentNoteView === 'admin' ? "Tap to add note" : "No note yet";
        noteEl.classList.add('empty-note');
    } else {
        noteEl.innerText = textToShow;
        noteEl.classList.remove('empty-note');
    }
    
    avatarEl.style.background = avatars[otherUser];
        
    if (unreadNotes[currentUser] && currentNoteView === 'admin') { dotEl.style.display = 'block'; } 
    else { dotEl.style.display = 'none'; }
}

window.toggleNoteView = function() {
    currentNoteView = currentNoteView === 'admin' ? 'kate' : 'admin';
    if (currentNoteView !== 'admin') { unreadNotes[currentUser] = false; }
    updateNoteUI();
}

window.editQuickNote = async function() {
    // 🔥 PUT YOUR CUSTOM FIREBASE EMAIL HERE TOO 🔥
    const MY_ADMIN_EMAIL = "mdrayeesulislam206@gmail.com";
    
    if (currentUser !== MY_ADMIN_EMAIL) { 
        showCustomModal({ title: "Access Denied", message: "You can only edit your own quick note." });
        return; 
    }
    const noteEl = document.getElementById('quickNoteText');
    let currentText = noteEl.classList.contains('empty-note') ? "" : noteEl.innerText;
    
    const newNote = await showCustomModal({
        title: "Update Quick Note",
        message: "Leave blank to remove.",
        type: "prompt",
        inputDefault: currentText,
        confirmText: "Update"
    });
    
    if (newNote === null) return; 
    notesDB['admin'] = newNote.trim();
    updateNoteUI();
}
// app.js - PART 2

window.deletePost = async function(btnElement) {
    const confirm = await showCustomModal({
        title: "Delete Transmission",
        message: "Are you sure you want to permanently delete this? It will be removed from the server.",
        type: "confirm",
        confirmText: "Delete",
        confirmIcon: "ph-bold ph-trash"
    });

    if (confirm) {
        btnElement.closest('.post').remove();
    }
}

// 6. KEYBOARD EMOJI REACTIONS
window.promptReaction = async function(btnElement) {
    const rawInput = await showCustomModal({
        title: "React",
        message: "Enter a single emoji from your keyboard.",
        type: "prompt",
        confirmText: "Add"
    });
    
    if (!rawInput || rawInput.trim() === "") return;
    
    const cleanEmoji = rawInput.trim();
    const emojiChar = [...cleanEmoji][0]; 
    if (!emojiChar) return;
    
    const container = btnElement.closest('.post-actions');
    const badgesDiv = container.querySelector('.reaction-badges');
    let existingBadge = Array.from(badgesDiv.children).find(b => b.innerText.includes(emojiChar));
    
    if (existingBadge) {
        let count = parseInt(existingBadge.getAttribute('data-count') || "1");
        count++;
        existingBadge.innerText = `${emojiChar} ${count}`;
        existingBadge.setAttribute('data-count', count);
    } else {
        if (badgesDiv.children.length >= 3) { 
            showCustomModal({ title: "Limit Reached", message: "Maximum 3 different emoji reactions allowed per transmission." });
            return; 
        }
        const newBadge = document.createElement('div');
        newBadge.className = 'badge';
        newBadge.innerText = `${emojiChar} 1`;
        newBadge.setAttribute('data-count', "1");
        badgesDiv.appendChild(newBadge);
    }
}

// 7. SIMULATE NETWORK & INITIALIZE PLAYERS
function simulateLoading() {
    setTimeout(() => {
        document.getElementById('skeletonFeed').style.display = 'none';
        const realFeed = document.getElementById('postFeed');
        realFeed.style.display = 'block';
        
        const posts = realFeed.querySelectorAll('.post');
        posts.forEach(post => {
            post.classList.add('hidden-scroll');
            observer.observe(post);
        });

        initCustomVideoPlayers();
        initCustomAudioPlayers();
    }, 2500); 
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- OPTIMIZED MEDIA ENGINES ---
function handleGlobalMediaPlay(mediaElement) {
    if (currentPlayingMedia && currentPlayingMedia !== mediaElement) {
        currentPlayingMedia.pause();
    }
    currentPlayingMedia = mediaElement;
}

function initCustomVideoPlayers() {
    const wrappers = document.querySelectorAll('.custom-video-wrapper');
    if (wrappers.length === 0) return; // Prevent errors on empty feed
    
    wrappers.forEach(wrapper => {
        const video = wrapper.querySelector('video');
        const playOverlay = wrapper.querySelector('.video-overlay-play');
        const progressFill = wrapper.querySelector('.thin-progress-fill');
        const touchArea = wrapper.querySelector('.thin-progress-touch-area');
        const speedIndicator = wrapper.querySelector('.speed-indicator');

        let pressTimer; let isLongPress = false; let isDragging = false;
        let scrubPos = 0; 

        video.addEventListener('play', () => handleGlobalMediaPlay(video));

        function updateVisualProgress(e) {
            const rect = touchArea.getBoundingClientRect();
            scrubPos = (e.clientX - rect.left) / rect.width;
            scrubPos = Math.max(0, Math.min(scrubPos, 1)); 
            progressFill.style.width = `${scrubPos * 100}%`;
        }

        touchArea.addEventListener('pointerdown', (e) => {
            isDragging = true; video.pause(); updateVisualProgress(e); e.stopPropagation(); 
        });
        document.addEventListener('pointermove', (e) => { if (isDragging) updateVisualProgress(e); });
        document.addEventListener('pointerup', () => { 
            if (isDragging) { isDragging = false; video.currentTime = scrubPos * video.duration; video.play(); } 
        });

        wrapper.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.thin-progress-touch-area')) return;
            isLongPress = false;
            pressTimer = setTimeout(() => { isLongPress = true; video.playbackRate = 2.0; speedIndicator.classList.remove('hidden'); }, 300); 
        });

        const cancelLongPress = () => { clearTimeout(pressTimer); if (isLongPress) { video.playbackRate = 1.0; speedIndicator.classList.add('hidden'); } };

        wrapper.addEventListener('pointerup', (e) => {
            if (e.target.closest('.thin-progress-touch-area')) return;
            clearTimeout(pressTimer);
            if (isLongPress) { video.playbackRate = 1.0; speedIndicator.classList.add('hidden'); } 
            else { if (video.paused) video.play(); else video.pause(); }
        });

        wrapper.addEventListener('pointerleave', cancelLongPress);
        wrapper.addEventListener('pointercancel', cancelLongPress);
        
        video.addEventListener('play', () => playOverlay.style.display = 'none');
        video.addEventListener('pause', () => playOverlay.style.display = 'flex');
        video.addEventListener('timeupdate', () => { if (!isDragging) { const percent = (video.currentTime / video.duration) * 100; progressFill.style.width = `${percent}%`; } });
    });
}

function initCustomAudioPlayers() {
    const audioPlayers = document.querySelectorAll('.custom-audio-player');
    if (audioPlayers.length === 0) return; // Prevent errors on empty feed
    
    audioPlayers.forEach(player => {
        const audio = player.querySelector('audio');
        const playBtn = player.querySelector('.audio-play-btn');
        const icon = playBtn.querySelector('i');
        const progressContainer = player.querySelector('.audio-waveform-container');
        const timeDisplay = player.querySelector('.audio-time');

        audio.addEventListener('play', () => handleGlobalMediaPlay(audio));

        let waveformHTML = '';
        for(let i=0; i<30; i++) {
            let h = Math.floor(Math.random() * 60) + 20; 
            waveformHTML += `<div class="waveform-bar" style="height: ${h}%"></div>`;
        }
        progressContainer.innerHTML = waveformHTML;
        const bars = progressContainer.querySelectorAll('.waveform-bar');

        let isDraggingAudio = false;
        let scrubPosAudio = 0;

        audio.addEventListener('loadedmetadata', () => { timeDisplay.innerText = formatTime(audio.duration); });
        playBtn.addEventListener('click', () => { if (audio.paused) { audio.play(); icon.classList.remove('ph-play'); icon.classList.add('ph-pause'); } else { audio.pause(); icon.classList.remove('ph-pause'); icon.classList.add('ph-play'); } });

        function updateAudioVisualProgress(e) {
            const rect = progressContainer.getBoundingClientRect();
            scrubPosAudio = (e.clientX - rect.left) / rect.width; 
            scrubPosAudio = Math.max(0, Math.min(scrubPosAudio, 1));
            
            bars.forEach((bar, index) => {
                if (index / bars.length <= scrubPosAudio) { bar.style.background = 'var(--gold-accent)'; } 
                else { bar.style.background = 'rgba(255,255,255,0.2)'; }
            });
        }

        progressContainer.addEventListener('pointerdown', (e) => { 
            isDraggingAudio = true; audio.pause(); updateAudioVisualProgress(e); 
        });
        
        document.addEventListener('pointermove', (e) => { if (isDraggingAudio) updateAudioVisualProgress(e); });
        
        document.addEventListener('pointerup', () => { 
            if (isDraggingAudio) {
                isDraggingAudio = false; 
                audio.currentTime = scrubPosAudio * audio.duration;
                audio.play();
                icon.classList.remove('ph-play'); 
                icon.classList.add('ph-pause');
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (!isDraggingAudio) { 
                const progress = audio.currentTime / audio.duration;
                bars.forEach((bar, index) => {
                    if (index / bars.length <= progress) { bar.style.background = 'var(--gold-accent)'; } 
                    else { bar.style.background = 'rgba(255,255,255,0.2)'; }
                });

                if (audio.currentTime > 0 && !audio.paused) { timeDisplay.innerText = formatTime(audio.currentTime); } 
                else { timeDisplay.innerText = formatTime(audio.duration); }
            }
        });
        
        audio.addEventListener('ended', () => { 
            icon.classList.remove('ph-pause'); icon.classList.add('ph-play'); 
            bars.forEach(bar => bar.style.background = 'rgba(255,255,255,0.2)'); 
            timeDisplay.innerText = formatTime(audio.duration); 
        });
    });
}

// 8. UPLOAD MODAL LOGIC
window.openUpload = function() { document.getElementById('uploadModal').classList.remove('hidden'); }
window.closeUpload = function() { document.getElementById('uploadModal').classList.add('hidden'); }
window.submitMockUpload = async function() { 
    await showCustomModal({ title: "Transmission Set", message: "Data packaged and ready. (Will connect to Firebase soon!)" });
    closeUpload(); 
}

// 9. DOCK NAVIGATION & SCROLL PHYSICS
window.activateDockIcon = function(event) {
    const buttons = document.querySelectorAll('.dock-item');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

window.filterPosts = function(category, event) {
    window.activateDockIcon(event);
    const posts = document.querySelectorAll('.post');
    posts.forEach(post => {
        if (category === 'all' || post.getAttribute('data-category') === category) {
            post.style.display = 'block';
            setTimeout(() => post.classList.add('show-scroll'), 50);
        } else {
            post.style.display = 'none';
            post.classList.remove('show-scroll');
        }
    });
}

const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-scroll');
            entry.target.classList.remove('hidden-scroll');
        }
    });
}, observerOptions);

// 10. PREMIUM HIGHLIGHTS (STORIES) LOGIC
const storiesData = []; // No mock stories
let currentStoryIndex = 0; 
let storyTimer;

function buildProgressBars() {
    const container = document.querySelector('.story-progress-container');
    container.innerHTML = '';
    storiesData.forEach((_, i) => container.innerHTML += `<div class="story-bar"><div class="story-bar-fill" id="bar-${i}"></div></div>`);
}

window.openStory = function(index) { 
    if (storiesData.length === 0) {
        showCustomModal({ title: "Highlights", message: "No active transmissions available." });
        return;
    }
    currentStoryIndex = index; 
    document.getElementById('storyViewer').classList.remove('hidden'); 
    buildProgressBars(); showCurrentStory(); 
}

window.closeStory = function() { 
    document.getElementById('storyViewer').classList.add('hidden'); 
    clearTimeout(storyTimer); document.getElementById('storyMediaContainer').innerHTML = '';
}

function showCurrentStory() {
    const data = storiesData[currentStoryIndex];
    const mediaContainer = document.getElementById('storyMediaContainer');
    
    if (data.type === 'video') {
        mediaContainer.innerHTML = `<video class="story-media" src="${data.src}" autoplay playsinline loop></video>`;
    } else {
        mediaContainer.innerHTML = `<img class="story-media" src="${data.src}">`;
    }
    
    document.getElementById('storyCaption').innerText = data.caption;
    document.querySelectorAll('.story-bar-fill').forEach((bar, i) => { bar.style.width = i < currentStoryIndex ? '100%' : '0%'; });
    
    setTimeout(() => {
        const currentBar = document.getElementById(`bar-${currentStoryIndex}`);
        currentBar.style.transition = 'width 5s linear'; currentBar.style.width = '100%';
    }, 50);
    
    clearTimeout(storyTimer); storyTimer = setTimeout(window.nextStory, 5000); 
}

window.nextStory = function() { if (currentStoryIndex < storiesData.length - 1) { currentStoryIndex++; showCurrentStory(); } else { window.closeStory(); } }
window.prevStory = function() { if (currentStoryIndex > 0) { currentStoryIndex--; showCurrentStory(); } else { showCurrentStory(); } }

