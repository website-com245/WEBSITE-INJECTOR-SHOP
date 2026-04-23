// ==========================================================================
// GLOBAL STATE
// ==========================================================================
let user = '';
let data = {};
let downloadsStatus = {};
let downloadIntervals = {};
let currentCommentAPK = '';
let chatWithCurrent = '';
let apksLoaded = false;
let downloadsLoaded = false;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
window.addEventListener('load', function() {
  initParticles();
  checkAutoLogin();
});

// Auto-login check
function checkAutoLogin() {
    const savedUser = localStorage.getItem('apkUser');
    
    if (!savedUser) {
        console.log(' No saved user found'); // DEBUG
        return false;
    }
    
    console.log(' Checking user for:', savedUser); // DEBUG
    
    showLoading(true, 'Welcome back...');
    
    db.ref(`users/${savedUser}`).once('value').then(snapshot => {
        showLoading(false);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('User verified:', savedUser); // DEBUG
            
            // ✅ SET GLOBAL USER
            user = savedUser;
            
            // ✅ RESTORE USER DATA
            localStorage.setItem('userPhone', userData.phone || '');
            localStorage.setItem('userGcash', userData.gcashNumber || userData.phone || '');
            localStorage.setItem('lastLogin', Date.now());
            
            // ✅ GO TO APP
            showScreen('app');
            showTab('home');
            loadUserData();
            setUserOnlineStatus(true);
            
            showNotification('👋 Welcome back ' + savedUser + '!', 'success');
            return true;
        } else {
            console.log('❌ User not found in DB, clearing...'); // DEBUG
            localStorage.removeItem('apkUser');
            showNotification('👤 Please login again', 'info');
            showScreen('login');
            return false;
        }
    }).catch(error => {
        showLoading(false);
        console.error('Auto-login error:', error);
        localStorage.removeItem('apkUser');
        showNotification('Login session expired', 'error');
        showScreen('login');
        return false;
    });
}
window.onload = function() {
    // ✅ AUTO-LOGIN FIRST
    if (checkAutoLogin()) {
        return; // Stop here if auto-logged in
    }
    
    // Normal login flow
    generateCaptcha();
    showScreen('login');
    
    // Auto-fill username
    const savedUser = localStorage.getItem('apkUser');
    if (savedUser) {
        document.getElementById('user').value = savedUser;
        document.getElementById('password').focus();
    }
};
// ==========================================================================
// UI CONTROL FUNCTIONS
// ==========================================================================
function showScreen(screenId) {
  document.querySelectorAll('[id^="login"], [id^="onboard"], [id^="app"]').forEach(el => {
    el.classList.remove('active', 'show');
    el.style.display = 'none';
  });
  document.getElementById(screenId).style.display = 'block';
  document.getElementById(screenId).classList.add('active');
}

function showTab(tabId) {
  // Update main tabs
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  
  // Load data for specific tab
  if (tabId === 'home') loadAPKs();
  if (tabId === 'profile') loadProfile();
  if (tabId === 'messenger') loadFriends();
  // Add to showTab function
if (tabId === 'shop') {
    // Load shop data
    window.location.href = 'shop.html';

}
}
function switchHomeTab(tabId) {
    document.querySelectorAll('.home-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchHomeTab('${tabId}')"]`).classList.add('active');
    
    document.querySelectorAll('.home-section').forEach(section => section.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    renderAPKs();
}

// ==========================================================================
// AUTHENTICATION
// ==========================================================================
let captchaValue = '';
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    captchaValue = Array.from({length: 5}, () => 
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    document.getElementById('captcha').textContent = captchaValue;
}

function login() {
    const username = document.getElementById('user').value.trim();
    const password = document.getElementById('password').value;
    const captcha = document.getElementById('capInput').value;
    const email = document.getElementById('email').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    
    if (captcha !== captchaValue) {
        showNotification('❌ Invalid CAPTCHA', 'error');
        generateCaptcha();
        return;
    }
    
    if (!username || !password) {
        showNotification('❌ Username & Password required', 'error');
        return;
    }
    
    db.ref(`users/${username}`).once('value').then(snapshot => {
        const userData = snapshot.val();
        
        if (userData && userData.password !== password) {
            showNotification('❌ Wrong password', 'error');
            return;
        }
        
        // ✅ SAVE USER DATA WITH PHONE
        user = username;
        localStorage.setItem('apkUser', username);
        localStorage.setItem('userPhone', userData?.phone || ''); // ✅ SAVE PHONE LOCALLY
        
        db.ref(`users/${username}`).update({
            password,
            email: email || '',
            telegram: telegram || '',
            lastLogin: Date.now(),
            phone: userData?.phone || '' // ✅ ENSURE PHONE IS SAVED
        });
        
        showScreen('onboard');
        showPhoneStep();
        setUserOnlineStatus(true);
    });
}

function showPhoneStep() {
    const phoneInput = document.getElementById('phoneNumber');
    const phoneBtn = document.getElementById('phoneBtn');
    
    phoneBtn.disabled = true;
    phoneInput.value = '';
    
    phoneInput.oninput = function() {
        let value = phoneInput.value.replace(/[^0-9]/g, '');
        phoneInput.value = value;
        
        phoneBtn.disabled = !(value.startsWith('09') && value.length === 11);
    };
}

function saveNumber() {
    const phone = document.getElementById('phoneNumber').value.trim();
    
    if (!phone.startsWith('09') || phone.length !== 11) {
        showNotification('❌ Invalid phone number (09XXXXXXXXX)', 'error');
        return;
    }
    
    // ✅ SAVE TO LOCALSTORAGE + FIREBASE
    db.ref(`users/${user}`).update({
        phone: phone,
        gcashNumber: phone // ✅ SAME AS GCASH
    });
    
    localStorage.setItem('userPhone', phone); // ✅ LOCAL BACKUP
    localStorage.setItem('userGcash', phone); // ✅ GCASH BACKUP
    
    document.getElementById('phoneScreen').classList.remove('active');
    document.getElementById('rulesScreen').classList.add('active');
    
    showNotification('✅ GCash number saved!', 'success');
}
function enterApp() {
    showScreen('app');
    showTab('home');
    loadUserData();
}


function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    setUserOnlineStatus(false);
    localStorage.removeItem('apkUser');
    user = '';
    location.reload();
}

// ==========================================================================
// UPLOAD FUNCTIONALITY
// ==========================================================================
function showPreview(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const img = new Image();
    img.onload = function() {
        if (img.width < 128 || img.height < 128) {
            showNotification('❌ Icon must be at least 128x128px', 'error');
            document.getElementById('iconFile').value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('previewIcon').src = e.target.result;
            document.getElementById('previewIcon').classList.add('show');
        };
        reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
}

function upload() {
    const name = document.getElementById('name').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const apkUrl = document.getElementById('apk').value.trim();
    const telegram = document.getElementById('telegramUpload').value.trim();
    const iconFile = document.getElementById('iconFile').files[0];
    
    if (!name || !apkUrl || !iconFile) {
        showNotification('❌ Please fill all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    fileToBase64(iconFile, iconData => {
        const newApkRef = db.ref('apks').push();
        
        newApkRef.set({
            appName: name,
            description: desc,
            apkURL: apkUrl,
            icon: iconData,
            uploadedBy: user,
            telegramLink: telegram,
            downloads: 0,
            likesCount: 0,
            comments: 0,
            time: Date.now()
        }).then(() => {
            showLoading(false);
            showNotification('🚀 Injector uploaded successfully!', 'success');
            clearUploadForm();
        }).catch(error => {
            showLoading(false);
            showNotification('❌ Upload failed. Try again.', 'error');
            console.error('Upload error:', error);
        });
    });
}

function clearUploadForm() {
    document.getElementById('name').value = '';
    document.getElementById('desc').value = '';
    document.getElementById('apk').value = '';
    document.getElementById('telegramUpload').value = '';
    document.getElementById('iconFile').value = '';
    document.getElementById('previewIcon').classList.remove('show');
}

// ==========================================================================
// DATA LOADING
// ==========================================================================
function loadUserData() {
    loadAPKs();
    loadDownloadsStatus();
    loadProfile();
    loadFriends();
}

function loadAPKs() {
    if (apksLoaded) return;
    apksLoaded = true;
    
    showLoadingContent();
    
    db.ref('apks').on('value', snapshot => {
        data = snapshot.val() || {};
        renderAPKs();
    });
}

function loadDownloadsStatus() {
    if (!user || downloadsLoaded) return;
    downloadsLoaded = true;
    
    db.ref(`downloadsStatus/${user}`).on('value', snapshot => {
        downloadsStatus = snapshot.val() || {};
        renderAPKs();
    });
}

function safeRender() {
    clearTimeout(window.renderTimeout);
    window.renderTimeout = setTimeout(renderAPKs, 200);
}

function renderAPKs() {
    const searchTerm = document.getElementById('search')?.value.toLowerCase() || '';
    const apkArray = Object.entries(data).map(([id, apk]) => ({ id, ...apk }));
    
    // Filter by search
    const filtered = apkArray.filter(apk => 
        apk.appName?.toLowerCase().includes(searchTerm)
    );
    
    // Render sections
    renderSection('latest', filtered.sort((a, b) => (b.time || 0) - (a.time || 0)));
    renderSection('top', filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0)));
    renderSection('my', filtered.filter(apk => apk.uploadedBy === user));
}

function renderSection(sectionId, apks) {
    const container = document.getElementById(sectionId);
    container.innerHTML = '';
    
    if (!apks.length) {
        container.innerHTML = `
            <div class="apk-loading">
                <div class="spinner"></div>
                <p>No ${sectionId === 'latest' ? 'latest' : sectionId === 'top' ? 'top' : 'your'} injectors found</p>
            </div>
        `;
        return;
    }
    
    apks.forEach(apk => container.appendChild(createApkCard(apk)));
}

function createApkCard(apk) {
    const card = document.createElement('div');
    card.className = 'apk-card';
    
    const status = downloadsStatus[apk.id] || '';
    const isLiked = apk.likes?.[user];
    const isOwner = apk.uploadedBy === user;
    const timeAgo = formatTimeAgo(apk.time);
    const showNewBadge = apk.updatedAt && (Date.now() - apk.updatedAt < 86400000);
    
    card.innerHTML = `
        <div class="apk-row">
            <img class="apk-icon" src="${apk.icon}" alt="${apk.appName}" loading="lazy">
            <div class="apk-info">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <div class="apk-title">
                        ${apk.appName}
                        ${showNewBadge ? '<span class="apk-badge">NEW</span>' : ''}
                    </div>
                    <div class="apk-menu">
                        <button class="menu-btn" onclick="toggleMenu('${apk.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown" id="menu_${apk.id}">
                            <button onclick="copyApkLink('${apk.id}')">
                                <i class="fas fa-link"></i> Copy Link
                            </button>
                            ${isOwner ? `
                                <button onclick="updateApk('${apk.id}')">
                                    <i class="fas fa-edit"></i> Update
                                </button>
                                <button class="text-danger" onclick="deleteApk('${apk.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="apk-desc">${apk.description || ''}</div>
                
                <div class="apk-meta">
                    <span><i class="fas fa-user"></i> ${apk.uploadedBy}</span>
                    <span>•</span>
                    <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                </div>
                
                <div class="apk-stats">
                    <span class="stat-tag"><i class="fas fa-download"></i> ${apk.downloads || 0}</span>
                    <span class="stat-tag"><i class="fas fa-heart"></i> ${apk.likesCount || 0}</span>
                    <span class="stat-tag"><i class="fas fa-comment"></i> ${apk.comments || 0}</span>
                </div>
                
                <div class="apk-actions">
                    <button class="action-btn like-btn ${isLiked ? 'active' : ''}" onclick="likeApk('${apk.id}')">
                        <i class="fas ${isLiked ? 'fa-heart' : 'fa-heart-o'}"></i>
                        Like
                    </button>
                    <button class="action-btn" onclick="openCommentModal('${apk.id}')">
                        <i class="fas fa-comment"></i> Comment
                    </button>
                    <button class="action-btn" onclick="reportApk('${apk.id}')">
                        <i class="fas fa-flag"></i> Report
                    </button>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar" id="progress_${apk.id}" style="width: ${status === 'done' ? '100%' : '0%'}"></div>
                </div>
                
                <button class="download-btn" onclick="startDownload('${apk.id}')">
                    ${status === 'done' ? '<i class="fas fa-check"></i> Re-download' : '<i class="fas fa-download"></i> Download'}
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// ==========================================================================
// INTERACTIONS
// ==========================================================================
function likeApk(id) {
    const likeRef = db.ref(`apks/${id}/likes/${user}`);
    const countRef = db.ref(`apks/${id}/likesCount`);
    
    likeRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Unlike
            likeRef.remove();
            updateLikesCount(id);
            updateLikeUI(id, false);
        } else {
            // Like
            likeRef.set(true);
            updateLikesCount(id);
            updateLikeUI(id, true);
            createHeartBurst(id);
        }
    });
}

function updateLikesCount(id) {
    db.ref(`apks/${id}/likes`).once('value').then(snapshot => {
        const count = Object.keys(snapshot.val() || {}).length;
        db.ref(`apks/${id}/likesCount`).set(count);
    });
}

function updateLikeUI(id, liked) {
    document.querySelectorAll(`[onclick="likeApk('${id}')"]`).forEach(btn => {
        const icon = btn.querySelector('i');
        btn.classList.toggle('active', liked);
        btn.innerHTML = liked 
            ? '<i class="fas fa-heart"></i> Liked'
            : '<i class="fas fa-heart-o"></i> Like';
    });
}

function createHeartBurst(id) {
    const btn = document.querySelector(`[onclick="likeApk('${id}')"]`);
    if (!btn) return;
    
    for (let i = 0; i < 5; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-float';
        heart.innerHTML = '❤️';
        heart.style.left = `${Math.random() * 40 - 20}px`;
        heart.style.top = `${Math.random() * 20}px`;
        heart.style.animationDelay = `${Math.random() * 0.2}s`;
        
        btn.appendChild(heart);
        setTimeout(() => heart.remove(), 800);
    }
}

function startDownload(id) {
    const apk = data[id];
    if (!apk) return;
    
    const progressBar = document.getElementById(`progress_${id}`);
    const status = downloadsStatus[id];
    
    if (status === 'done') {
        window.open(apk.apkURL, '_blank');
        return;
    }
    
    if (downloadIntervals[id]) clearInterval(downloadIntervals[id]);
    
    let progress = 0;
    downloadIntervals[id] = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress > 100) progress = 100;
        
        progressBar.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(downloadIntervals[id]);
            window.open(apk.apkURL, '_blank');
            
            db.ref(`downloadsStatus/${user}/${id}`).set('done');
            db.ref(`apks/${id}/downloads`).transaction(downloads => (downloads || 0) + 1);
        }
    }, 250);
}

function toggleMenu(id) {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        if (dropdown.id !== `menu_${id}`) {
            dropdown.classList.remove('show');
        }
    });
    
    const menu = document.getElementById(`menu_${id}`);
    menu.classList.toggle('show');
}
function copyApkLink(id, productName) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$|index\.html$/, '');
    const viewUrl = `${baseUrl}/view.html?id=${id}`;
    
    navigator.clipboard.writeText(viewUrl).then(() => {
        showNotification(`🔗 ${productName} link copied!`, 'success');
    });
}

function deleteApk(id) {
    if (data[id]?.uploadedBy !== user) {
        showNotification('❌ Not authorized', 'error');
        return;
    }
    
    if (confirm('Delete this injector?')) {
        db.ref(`apks/${id}`).remove();
        showNotification('🗑️ APK deleted', 'success');
    }
}

// ==========================================================================
// COMMENTS & REPORTS
// ==========================================================================
let reportTargetId = '';
function openCommentModal(id) {
    currentCommentAPK = id;
    document.getElementById('commentModal').classList.add('show');
    loadComments(id);
}

function closeCommentModal() {
    document.getElementById('commentModal').classList.remove('show');
}

function loadComments(id) {
    const list = document.getElementById('commentList');
    db.ref(`apks/${id}/comments`).on('value', snapshot => {
        list.innerHTML = '';
        const comments = snapshot.val() || {};
        
        Object.values(comments).forEach(comment => {
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `<strong>${comment.user}:</strong> ${comment.text}`;
            list.appendChild(div);
        });
    });
}

function postComment() {
    const text = document.getElementById('newComment').value.trim();
    if (!text) return;
    
    db.ref(`apks/${currentCommentAPK}/comments`).push({
        user,
        text,
        time: Date.now()
    });
    
    document.getElementById('newComment').value = '';
}

function reportApk(id) {
    reportTargetId = id;
    document.getElementById('reportModal').classList.add('show');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('show');
}

function submitReport() {
    const reason = document.getElementById('reportReason').value;
    const details = document.getElementById('reportText').value.trim();
    
    const reportRef = db.ref('reports').push();
    reportRef.set({
        apkId: reportTargetId,
        reporter: user,
        reason,
        details,
        status: 'pending',
        time: Date.now()
    });
    
    sendTelegramReport(reportRef.key);
    closeReportModal();
    showNotification('📤 Report submitted', 'success');
}

// ==========================================================================
// PROFILE
// ==========================================================================
function loadProfile() {
    db.ref(`users/${user}`).on('value', snapshot => {
        const profile = snapshot.val() || {};
        document.getElementById('profileName').textContent = user;
        document.getElementById('profileEmail').textContent = profile.email || 'No email';
        document.getElementById('profileTelegram').textContent = profile.telegram || 'No telegram';
        document.getElementById('profilePhone').textContent = profile.phone || 'No phone';
        
        if (profile.profilePic) document.getElementById('profilePic').src = profile.profilePic;
        if (profile.coverPhoto) document.getElementById('coverPhoto').src = profile.coverPhoto;
    });
    
    // Load stats
    db.ref('apks').on('value', snapshot => {
        const apks = snapshot.val() || {};
        let likes = 0, comments = 0, downloads = 0;
        
        Object.values(apks).forEach(apk => {
            if (apk.uploadedBy === user) {
                              likes += apk.likesCount || 0;
                comments += apk.comments || 0;
                downloads += apk.downloads || 0;
            }
        });
        
        document.getElementById('profileLikes').textContent = likes;
        document.getElementById('profileComments').textContent = comments;
        document.getElementById('profileDownloads').textContent = downloads;
    });
}

function updateProfilePic() {
    const file = document.getElementById('profilePicFile').files[0];
    if (!file) return;
    
    fileToBase64(file, base64 => {
        db.ref(`users/${user}/profilePic`).set(base64).then(() => {
            showNotification('👤 Profile picture updated', 'success');
        });
    });
}

function updateCover() {
    const file = document.getElementById('coverFile').files[0];
    if (!file) return;
    
    fileToBase64(file, base64 => {
        db.ref(`users/${user}/coverPhoto`).set(base64).then(() => {
            showNotification('🖼️ Cover photo updated', 'success');
        });
    });
}

// ==========================================================================
// MESSAGING
// ==========================================================================
function loadFriends() {
    db.ref(`friends/${user}/list`).on('value', snapshot => {
        const container = document.getElementById('friendList');
        container.innerHTML = '';
        const friends = snapshot.val() || {};
        
        Object.keys(friends).forEach(friend => {
            const item = document.createElement('div');
            item.className = 'friend-item';
            item.innerHTML = `
                <span>${friend}</span>
                <button class="action-btn" onclick="openChat('${friend}')">
                    <i class="fas fa-comment"></i> Chat
                </button>
            `;
            container.appendChild(item);
        });
    });
}

function openChat(friend) {
    chatWithCurrent = friend;
    document.getElementById('chatModal').classList.add('show');
    document.getElementById('chatWith').textContent = friend;
    loadChat(friend);
}

function closeChatModal() {
    document.getElementById('chatModal').classList.remove('show');
}

function loadChat(friend) {
    const messagesDiv = document.getElementById('chatMessages');
    const chatId = [user, friend].sort().join('_');
    
    db.ref(`messages/${chatId}`).on('value', snapshot => {
        messagesDiv.innerHTML = '';
        const messages = snapshot.val() || {};
        
        Object.values(messages).sort((a, b) => a.time - b.time).forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.from === user ? 'sent' : 'received'}`;
            div.textContent = `${msg.from}: ${msg.text}`;
            messagesDiv.appendChild(div);
        });
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

function sendMessage() {
    const text = document.getElementById('chatInput').value.trim();
    if (!text) return;
    
    const chatId = [user, chatWithCurrent].sort().join('_');
    db.ref(`messages/${chatId}`).push({
        from: user,
        text,
        time: Date.now()
    });
    
    document.getElementById('chatInput').value = '';
}

// ==========================================================================
// QR CODE
// ==========================================================================
function openQR() {
    document.getElementById('qrModal').classList.add('show');
    document.getElementById('qrUsername').textContent = user;
    
    db.ref(`users/${user}`).once('value').then(snapshot => {
        const profile = snapshot.val() || {};
        document.getElementById('qrProfilePic').src = profile.profilePic || 'https://via.placeholder.com/80';
    });
    
    const qrData = `${window.location.origin}/?user=${user}`;
    QRCode.toCanvas(document.getElementById('qrCanvasLarge'), qrData, {
        width: 220,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    });
}

function closeQR() {
    document.getElementById('qrModal').classList.remove('show');
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function showLoading(show = true) {
    document.getElementById('uploadLoading').classList.toggle('show', show);
}

function showLoadingContent() {
    ['latest', 'top', 'my'].forEach(section => {
        document.getElementById(section).innerHTML = `
            <div class="apk-loading">
                <div class="spinner"></div>
                <p>Loading ${section}...</p>
            </div>
        `;
    });
}

function fileToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsDataURL(file);
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    
    return `${Math.floor(seconds / 2592000)}mo ago`;
}

function setUserOnlineStatus(online) {
    if (!user) return;
    
    db.ref(`users/${user}/status`).set({
        online,
        lastSeen: Date.now()
    });
}

// ==========================================================================
// SIDEBAR CONTROL
// ==========================================================================
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
}

function goTab(tabId) {
    closeSidebar();
    showTab(tabId);
}

// ==========================================================================
 // PARTICLES EFFECT
// ==========================================================================
function initParticles() {
    particlesJS('particles-js', {
        particles: {
            number: { value: 100, density: { enable: true, value_area: 800 } },
            color: { value: ['#667eea', '#764ba2', '#f093fb', '#f5576c'] },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#667eea',
                opacity: 0.3,
                width: 1
            },
            move: { enable: true, speed: 2 }
        },
        interactivity: {
            events: {
                onhover: { enable: true, mode: 'grab' },
                onclick: { enable: true, mode: 'push' }
            },
            modes: {
                grab: { distance: 200, line_linked: { opacity: 0.5 } },
                push: { particles_nb: 4 }
            }
        },
        retina_detect: true
    });
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
document.addEventListener('click', e => {
    if (!e.target.closest('.apk-menu')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
});

window.addEventListener('beforeunload', () => setUserOnlineStatus(false));

// Generate initial CAPTCHA
generateCaptcha();

// ==========================================================================
// END OF APP.JS
// ==========================================================================
               