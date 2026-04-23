// Shop JavaScript - COMPLETE VERSION
let products = {};
let currentUser = localStorage.getItem('apkUser') || 'guest';
let currentProductId = '';

// Initialize
window.onload = function() {
    initParticles();
    loadProducts();
};

function loadProducts() {
    db.ref('shop/products').on('value', snapshot => {
        products = snapshot.val() || {};
        renderProducts();
    });
}

function renderProducts() {
    const productArray = Object.entries(products).map(([id, product]) => ({ id, ...product }));
    
    // Featured (random selection)
    const featured = productArray.filter(p => p.status === 'active').sort(() => 0.5 - Math.random()).slice(0, 8);
    renderShopSection('featured', featured);
    
    // Most bought
    const popular = productArray.filter(p => p.status === 'active').sort((a, b) => (b.sales || 0) - (a.sales || 0));
    renderShopSection('popular', popular.slice(0, 12));
    
    // Newest
    const newest = productArray.filter(p => p.status === 'active').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderShopSection('new', newest.slice(0, 12));
}

function renderShopSection(sectionId, productsList) {
    const container = document.getElementById(sectionId);
    container.innerHTML = '';
    
    productsList.forEach(product => {
        const card = createProductCard(product);
        if (product.owner === currentUser) {
            card.classList.add('isOwner');
        }
        container.appendChild(card);
    });
}
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.cssText = `
        background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); 
        transition: all 0.3s; cursor: pointer; border: 1px solid #e2e8f0;
    `;
    
    const isOwner = product.owner === currentUser;
    const hasVideo = product.video;
    const thumbnail = product.thumbnail || 'https://via.placeholder.com/400x250/1e293b/94a3b8?text=No+Image';
    
    let actionButton = '';
    if (isOwner) {
        actionButton = `
            <div class="seller-actions" style="padding: 1rem; display: flex; gap: 0.5rem;">
                <button class="btn-sm btn-secondary" onclick="event.stopPropagation(); viewSellerOrders('${product.id}')" style="
                    flex: 1; padding: 0.75rem; border-radius: 12px; 
                    background: linear-gradient(135deg, #3b82f6, #2563eb); 
                    color: white; border: none; font-weight: 500; cursor: pointer;
                ">
                    <i class="fas fa-list-alt"></i> View Orders
                </button>
            </div>
        `;
    } else {
        actionButton = `
            <div class="buy-btn-wrapper" style="padding: 1rem;">
                <button class="buy-btn" onclick="event.stopPropagation(); buyProduct('${product.id}')" style="
                    width: 100%; background: linear-gradient(135deg, #10b981, #059669); 
                    color: white; padding: 1rem; text-align: center; font-weight: 600; 
                    border-radius: 12px; border: none; cursor: pointer; transition: all 0.3s;
                    box-shadow: 0 8px 20px rgba(16,185,129,0.3);
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <i class="fas fa-shopping-cart"></i> Buy Now ₱${parseFloat(product.price).toFixed(2)}
                </button>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="product-media" style="position: relative; height: 200px; overflow: hidden;">
            <img src="${thumbnail}" alt="${product.name}" class="product-thumbnail" style="
                width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;
            " onerror="this.src='https://via.placeholder.com/400x250/1e293b/94a3b8?text=No+Image'">
            ${hasVideo ? '<div class="product-play" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,0.7); color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><i class="fas fa-play"></i></div>' : ''}
        </div>
        <div class="product-info" style="padding: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600; color: #1e293b; line-height: 1.3;">${product.name}</h3>
            <div class="product-price" style="font-size: 1.5rem; font-weight: 700; color: #10b981; margin-bottom: 0.5rem;">
                ₱${parseFloat(product.price).toFixed(2)}
            </div>
            <div class="product-owner" style="color: #64748b; font-size: 0.875rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-user"></i> by <strong>${product.owner}</strong> 
                <span style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                    ${product.sales || 0} sales
                </span>
                ${product.hostingUrl ? '<i class="fas fa-cloud" style="font-size: 0.75rem; opacity: 0.7;" title="Hosted externally"></i>' : ''}
            </div>
            ${actionButton}
        </div>
    `;
    
    // ✅ FIXED: Only owners can preview, buyers ONLY BUY button
    card.onmouseover = () => {
        card.style.transform = 'translateY(-8px)';
        card.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
    };
    card.onmouseout = () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)';
    };
    
    // ✅ FIXED CLICK BEHAVIOR
    if (isOwner) {
        // Seller: Click card to preview hosting URL
        card.onclick = () => {
            if (product.hostingUrl) {
                window.open(product.hostingUrl, '_blank');
            } else {
                showNotification('No hosting URL set yet', 'error');
            }
        };
    } else {
        // Buyer: NO card click - only BUY button works
        card.style.cursor = 'default';
        card.onclick = (e) => {
            e.stopPropagation(); // Prevent any accidental clicks
        };
    }
    
    return card;
}
// ADD THIS FUNCTION for seller orders (put in shop.js)

function switchShopTab(tabId) {
    document.querySelectorAll('.shop-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchShopTab('${tabId}')"]`).classList.add('active');

    document.querySelectorAll('.shop-section').forEach(section => section.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}


function openUploadProduct() {
    document.getElementById('uploadProductModal').classList.add('show');
}

function closeUploadProduct() {
    document.getElementById('uploadProductModal').classList.remove('show');
    document.getElementById('productForm').reset();
    document.getElementById('thumbPreview').classList.remove('show');
}


// Product Upload Form
// Enhanced Product Upload
// Replace the OLD productForm event listener (lines with apkInput, supabase.storage, etc.)
document.addEventListener('DOMContentLoaded', function() {
    const productForm = document.getElementById('productForm');
    const thumbInput = document.getElementById('productThumbnail');
    const hostingInput = document.getElementById('hostingUrl');
    const thumbPreview = document.getElementById('thumbPreview');
    const manualKeysInput = document.getElementById('manualKeys'); // NEW
    const hostingHelp = document.getElementById('hostingHelp');
    
    // Thumbnail preview
    thumbInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                thumbPreview.src = e.target.result;
                thumbPreview.classList.add('show');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Hosting URL validation
    hostingInput.addEventListener('input', function(e) {
        const url = e.target.value;
        if (url && !url.startsWith('https://')) {
            hostingHelp.textContent = '⚠️ Please enter a valid HTTPS URL';
            hostingHelp.style.color = '#ef4444';
        } else if (url) {
            hostingHelp.textContent = '✅ Valid URL - Ready to save!';
            hostingHelp.style.color = '#10b981';
        } else {
            hostingHelp.textContent = 'Copy the direct link from File Manager after uploading';
            hostingHelp.style.color = '#64748b';
        }
    });
    
    // Manual keys counter (NEW)
    manualKeysInput.addEventListener('input', function(e) {
        const keys = e.target.value.trim().split('\n').filter(k => k.trim());
        const count = keys.length;
        manualKeysInput.style.borderColor = count > 0 ? '#10b981' : '#e2e8f0';
        
        if (count === 0) {
            manualKeysInput.parentElement.querySelector('small').textContent = 'Enter keys manually (one per line). Keys will be approved by you later.';
        } else {
            manualKeysInput.parentElement.querySelector('small').textContent = `${count} key(s) entered - Will be pending approval`;
        }
    });
    
    // ✅ NEW SUBMIT HANDLER - MANUAL KEYS (NO AUTO GENERATION)
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const desc = document.getElementById('productDesc').value;
        const thumbnailFile = document.getElementById('productThumbnail').files[0];
        const hostingUrl = document.getElementById('hostingUrl').value.trim();
        const manualKeysText = document.getElementById('manualKeys').value.trim();
        
        // Validation
        if (!name) {
            showNotification('Please enter product name!', 'error');
            return;
        }
        if (!thumbnailFile) {
            showNotification('Please select a thumbnail image!', 'error');
            return;
        }
        if (!hostingUrl || !hostingUrl.startsWith('https://')) {
            showNotification('Please enter a valid HTTPS hosting URL!', 'error');
            return;
        }
        if (!manualKeysText) {
            showNotification('Please enter at least one key!', 'error');
            return;
        }
        
        // Parse manual keys
        const manualKeys = manualKeysText.split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 5); // Minimum 5 chars per key
        
        if (manualKeys.length === 0) {
            showNotification('Please enter valid keys (one per line, min 5 chars each)!', 'error');
            return;
        }
        
        showLoading(true, `Saving product with ${manualKeys.length} pending keys...`);
        
        try {
            // 1. Convert thumbnail to base64
            const thumbnailBase64 = await fileToBase64(thumbnailFile);
            
            // 2. Save to Firebase with PENDING KEYS (NO ACTIVE KEYS YET)
            const productRef = db.ref('shop/products').push();
            await productRef.set({
                name: name,
                price: price,
                description: desc,
                thumbnail: thumbnailBase64,
                hostingUrl: hostingUrl,
                owner: currentUser,
                sales: 0,
                // ✅ MANUAL KEYS SYSTEM
                keysPending: manualKeys, // Keys waiting for seller approval
                totalKeysPending: manualKeys.length,
                keys: [], // Empty - no active keys yet
                totalKeys: 0,
                usedKeys: 0,
                createdAt: Date.now(),
                status: 'active'
            });
            
            showLoading(false);
            closeUploadProduct();
            document.getElementById('productForm').reset();
            thumbPreview.classList.remove('show');
            
            showNotification(`✅ Product uploaded successfully! ${manualKeys.length} keys pending your approval in Key Manager.`, 'success');
            
        } catch (error) {
            showLoading(false);
            showNotification('❌ Save failed: ' + error.message, 'error');
        }
    });
});

// File Manager button function
function openFileManager() {
    window.open('open-files.html', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
}

// REMOVE generateKeys function - NO LONGER NEEDED
// (Seller manually enters keys in textarea)
function buyProduct(id) {
    const product = products[id];
    if (!product) {
        showNotification('Product not found!', 'error');
        return;
    }
    
    currentProductId = id;
    
    // Populate purchase modal
    document.getElementById('purchaseDate').textContent = new Date().toLocaleString();
    document.getElementById('purchaseProduct').textContent = product.name;
    document.getElementById('purchaseSeller').textContent = product.owner;
    document.getElementById('purchaseAmount').textContent = `₱${parseFloat(product.price).toFixed(2)}`;
    
    // ✅ DYNAMIC SELLER GCASH - NEW CODE
    const sellerUsername = product.owner;
    getSellerGcash(sellerUsername).then(sellerGcash => {
        document.getElementById('sellerGcash').textContent = sellerGcash;
        document.getElementById('purchaseModal').classList.add('show');
    });
}
// ✅ GET REAL SELLER GCASH FROM FIREBASE
function getSellerGcash(sellerUsername) {
    return new Promise((resolve) => {
        db.ref(`users/${sellerUsername}`).once('value').then(snapshot => {
            const sellerData = snapshot.val();
            const gcash = sellerData?.gcashNumber || 
                         sellerData?.phone || 
                         'Contact seller for GCash';
            resolve(gcash);
        }).catch(() => {
            resolve('Contact seller for GCash');
        });
    });
}
function confirmPurchase() {
    const gcashNumber = document.getElementById('buyerGcash').value;
    const proofFile = document.getElementById('proofFile').files[0];

    if (!gcashNumber || !proofFile) {
        showNotification('Please provide GCash number and payment proof!', 'error');
        return;
    }

    showLoading(true, 'Processing purchase...');

    fileToBase64(proofFile).then(proofImage => {
        const product = products[currentProductId];
        if (!product) return;

        // Create order
        const orderRef = db.ref('shop/orders').push();
orderRef.set({
    productId: currentProductId,
    productName: product.name,
    buyer: currentUser, // ✅ BUYER
    seller: product.owner, // ✅ CORRECT SELLER FROM PRODUCT
    price: product.price,
    // ... rest

            gcashNumber: gcashNumber,
            status: 'pending',
            proofImage: proofImage,
            timestamp: Date.now(),
            buyerGcash: gcashNumber
        }).then(() => {
            // Increment sales
            db.ref(`shop/products/${currentProductId}/sales`).transaction(sales => (sales || 0) + 1);
            
            showLoading(false);
            document.getElementById('purchaseModal').classList.remove('show');
            document.getElementById('buyerGcash').value = '';
            document.getElementById('proofFile').value = '';
            document.getElementById('proofPreview').classList.remove('show');
            
            showNotification('✅ Purchase submitted! Waiting for seller approval.', 'success');
        }).catch(err => {
            showLoading(false);
            showNotification('❌ Purchase failed: ' + err.message, 'error');
        });
    });
}

function copySellerGcash() {
    const gcashNumber = document.getElementById('sellerGcash').textContent;
    if (gcashNumber === 'No GCash set') {
        showNotification('Seller has no GCash number set', 'error');
        return;
    }
    
    navigator.clipboard.writeText(gcashNumber).then(() => {
        showNotification(`📱 ${gcashNumber} copied! Send payment here.`, 'success');
    });
}
// Purchase Modal Handlers
document.addEventListener('DOMContentLoaded', function() {
    const proofInput = document.getElementById('proofFile');
    const proofPreview = document.getElementById('proofPreview');

    if (proofInput && proofPreview) {
        proofInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    proofPreview.src = e.target.result;
                    proofPreview.classList.add('show');
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
// Add this to shop.js after existing functions

// Replace the existing viewSellerOrders function in shop.js
function viewSellerOrders(productId) {
    localStorage.setItem('viewingProductId', productId);
    window.location.href = 'seller-dashboard.html';
}

// Update createProductCard function - modify seller actions


function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; padding: 1rem 2rem; border-radius: 12px; z-index: 10001; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        font-weight: 500; transform: translateX(400px); transition: all 0.3s;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notif.style.transform = 'translateX(400px)';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

function showLoading(show = true, text = 'Loading...') {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); 
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000;">
                <div style="width: 60px; height: 60px; border: 4px solid #f3f4f6; border-top: 4px solid #10b981; 
                            border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
                <p style="color: white; font-size: 1.1rem; margin: 0;">${text}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = show ? 'flex' : 'none';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80 },
                color: { value: ['#10b981', '#34d399', '#3b82f6'] },
                shape: { type: 'circle' },
                opacity: { value: 0.4 },
                size: { value: 3 },
                move: { speed: 1 }
            },
            interactivity: {
                events: { onhover: { enable: true, mode: 'repulse' } }
            }
        });
    }
}
function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
    document.getElementById("overlay").classList.toggle("active");
}