document.addEventListener('DOMContentLoaded', () => {
    const rawUser = localStorage.getItem('nearbites_user') || sessionStorage.getItem('nearbites_user');
    if (!rawUser) return; 
    const user = JSON.parse(rawUser);
    const type = Number(user.userType);
    const path = window.location.pathname;

    // ==========================================
    // 1. DEDICATED ONBOARDING REDIRECT
    // ==========================================
    if (type === 1 && Number(user.hasCompletedOnboarding) === 0) {
        if (!path.includes('onboarding.html')) {
            window.location.replace('/onboarding.html');
            return;
        }
    }

    // ==========================================
    // 2. SELLER PASSWORD ONBOARDING TRAP
    // ==========================================
    if (Number(user.mustChangePassword) === 1) {
        setTimeout(() => {
            openProfileModal();
            const msg = document.getElementById('profileMessage');
            if (msg) {
                msg.innerText = "Please update your default password to secure your account.";
                msg.classList.remove('hidden');
                msg.classList.add('text-red-600');
            }
        }, 500); 
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('forcePassword') === 'true') {
        setTimeout(() => {
            openProfileModal();
            const msg = document.getElementById('profileMessage');
            if (msg) {
                msg.innerText = "Please update your password to secure your account.";
                msg.classList.remove('hidden');
                msg.classList.add('text-red-600');
            }
        }, 500); 
    }

    // ==========================================
    // 3. RESPONSIVE NAVBAR BUILDER
    // ==========================================
    const navbarContainer = document.getElementById('nearbites-navbar');
    if (navbarContainer) {
        const getCls = (target) => {
            const base = "flex items-center justify-center px-3 sm:px-4 h-full font-medium transition-colors duration-200 text-sm border-b-2";
            let isActive = false;
            if (target === '/seller-dashboard.html' && path === '/manage-menu.html') isActive = true;
            else if (target === '/student-dashboard.html' && path === '/product.html') isActive = true;
            else if (path === target) isActive = true;
            
            return isActive 
                ? `${base} text-red-700 border-red-700 font-bold bg-red-50/50`
                : `${base} text-gray-500 border-transparent hover:text-red-700 hover:border-red-200`;
        };

        const makeLink = (href, text, iconPath) => `
            <a href="${href}" class="${getCls(href)}" title="${text}">
                <svg class="w-6 h-6 md:w-5 md:h-5 md:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"></path>
                </svg>
                <span class="hidden md:block">${text}</span>
            </a>
        `;

        const iconHome = "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6";
        const iconProfile = "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z";
        const iconFood = "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"; 
        const iconStores = "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"; 
        const iconPlan = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";

        let links = '';
        if (type === 1) { 
            // Student Nav
            links = makeLink('/student-dashboard.html', 'Home', iconHome) + 
                    makeLink('/meal-plan.html', 'AI Plan', iconPlan) + 
                    makeLink('/profile.html', 'Profile', iconProfile);
        } else if (type === 2) { 
            // Seller Nav
            links = makeLink('/seller-dashboard.html', 'Stores', iconStores) + 
                    makeLink('/student-dashboard.html', 'Food', iconFood) + 
                    makeLink('/meal-plan.html', 'AI Plan', iconPlan) + 
                    makeLink('/profile.html', 'Profile', iconProfile);
        } else if (type === 3) { 
            // Admin Nav
            links = makeLink('/admin-dashboard.html', 'Dashboard', iconHome) + 
                    makeLink('/student-dashboard.html', 'Food', iconFood) + 
                    makeLink('/profile.html', 'Profile', iconProfile);
        }

        navbarContainer.innerHTML = `
            <nav class="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        
                        <div class="flex items-center flex-1 h-full">
                            <span class="text-red-700 font-black text-xl md:text-2xl tracking-tighter mr-2 md:mr-8 cursor-pointer" onclick="window.location.href='/student-dashboard.html'">Nearbites.</span>
                            <div class="flex h-full">
                                ${links}
                            </div>
                        </div>

                        <div class="flex items-center space-x-2 ml-4">
                            <div class="relative hidden sm:block">
                                <input type="text" readonly placeholder="Search food or stores..." onclick="openGlobalSearch()" class="w-48 lg:w-64 pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition outline-none shadow-sm">
                                <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            
                            <button onclick="openGlobalSearch()" class="sm:hidden p-2 text-gray-500 hover:text-red-700 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 transition">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </button>
                        </div>

                    </div>
                </div>
            </nav>
        `;
    }

    // ==========================================
    // 4. INJECT GLOBAL MODALS
    // ==========================================
    const modalHTML = `
        <div id="globalProfileModal" class="fixed inset-0 bg-black/60 hidden items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
            <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-black text-gray-900">Security Update</h2>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Password Required</label>
                        <div class="relative">
                            <input type="password" id="editProfilePass" placeholder="Enter a secure password" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600 outline-none transition font-medium">
                            <button type="button" onclick="const p = document.getElementById('editProfilePass'); p.type = p.type === 'password' ? 'text' : 'password';" class="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-red-700 transition">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>
                        </div>
                    </div>
                    <button onclick="saveProfileChanges()" class="w-full bg-red-700 text-white font-bold py-3.5 rounded-xl hover:bg-red-800 transition mt-6 shadow-md hover:shadow-lg">Update Security</button>
                </div>
                <p id="profileMessage" class="text-sm text-center mt-4 hidden font-bold"></p>
            </div>
        </div>
    `;

    const searchOverlayHTML = `
        <div id="globalSearchOverlay" class="fixed inset-0 z-[100] hidden opacity-0 transition-opacity duration-300">
            <div class="absolute inset-0 bg-white/95 backdrop-blur-md"></div>

            <button onclick="closeGlobalSearch()" class="absolute top-6 right-6 text-gray-400 hover:text-red-700 p-2 text-5xl leading-none transition z-50">&times;</button>

            <div class="absolute inset-0 overflow-y-auto pb-48">
                <div class="flex flex-col items-center justify-start min-h-full px-4 max-w-4xl mx-auto w-full pt-20 md:pt-32">
                    <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-8 tracking-tight text-center">What are you craving?</h2>
                    
                    <div class="w-full mb-8">
                        <input type="text" id="globalSearchInput" placeholder="Search food or stores..." onkeydown="if(event.key === 'Enter') executeGlobalSearch();" class="w-full px-6 py-5 md:px-8 md:py-6 rounded-3xl border-2 border-gray-200 text-xl md:text-2xl font-medium text-gray-900 shadow-lg focus:border-red-600 focus:ring-0 outline-none transition placeholder-gray-300 text-center">
                    </div>

                    <div class="w-full bg-gray-50 rounded-3xl p-5 md:p-8 border border-gray-200 shadow-inner mb-8">
                        <h3 class="text-lg font-bold text-gray-700 mb-6 flex items-center space-x-2">
                            <span>Fine-tune your search</span>
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                            <div>
                                <label class="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Max Budget (₱)</label>
                                <input type="number" id="globalSearchPrice" min="0" placeholder="Any price" class="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 transition font-medium text-gray-900 shadow-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Minimum Rating</label>
                                <select id="globalSearchStars" class="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 transition font-medium text-gray-600 shadow-sm">
                                    <option value="0">Any Rating</option>
                                    <option value="3">3+ Stars</option>
                                    <option value="4">4+ Stars</option>
                                    <option value="5">5 Stars Only</option>
                                </select>
                            </div>
                            <div class="flex flex-col">
                                <div class="flex justify-between items-end mb-2">
                                    <label class="block text-sm font-bold text-gray-500 uppercase tracking-wider">Dietary Tags</label>
                                    <button onclick="clearAllGlobalTags()" class="text-xs font-bold text-red-600 hover:text-red-800 transition uppercase tracking-wider">Clear All</button>
                                </div>
                                <input type="text" id="globalSearchTagsInput" placeholder="Type tag & press Enter" onkeydown="handleGlobalTagEnter(event)" class="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 font-medium text-gray-900 text-sm shadow-sm">
                            </div>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2 items-center" id="globalTagsContainer"></div>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-0 left-0 right-0 p-4 pb-6 md:p-6 md:pb-8 bg-gradient-to-t from-white via-white/95 to-transparent flex justify-center pointer-events-none z-50">
                <button onclick="executeGlobalSearch()" class="w-full max-w-sm bg-red-700 text-white font-black text-xl py-4 md:py-5 rounded-3xl hover:bg-red-800 hover:-translate-y-1 transition duration-300 shadow-2xl flex justify-center items-center space-x-3 pointer-events-auto">
                    <span>Search Now</span>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </button>
            </div>
            
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', searchOverlayHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
});

// ==========================================
// 5. GLOBAL FUNCTIONS
// ==========================================
window.openGlobalSearch = function() {
    const o = document.getElementById('globalSearchOverlay');
    if (o) {
        o.classList.remove('hidden');
        o.classList.add('flex');
        setTimeout(() => {
            o.classList.remove('opacity-0');
            o.classList.add('opacity-100');
            document.getElementById('globalSearchInput').focus();
        }, 10);
    }
};

window.closeGlobalSearch = function() {
    const o = document.getElementById('globalSearchOverlay');
    if (o) {
        o.classList.remove('opacity-100');
        o.classList.add('opacity-0');
        setTimeout(() => {
            o.classList.remove('flex');
            o.classList.add('hidden');
            document.getElementById('globalSearchInput').value = '';
        }, 300);
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGlobalSearch();
});

window.openProfileModal = function() {
    document.getElementById('globalProfileModal').classList.remove('hidden');
    document.getElementById('globalProfileModal').classList.add('flex');
};

window.closeProfileModal = function() {
    document.getElementById('globalProfileModal').classList.add('hidden');
    document.getElementById('globalProfileModal').classList.remove('flex');
    document.getElementById('profileMessage').classList.add('hidden');
};

window.saveProfileChanges = async function() {
    const user = JSON.parse(localStorage.getItem('nearbites_user') || sessionStorage.getItem('nearbites_user'));
    const newPass = document.getElementById('editProfilePass').value;
    const msg = document.getElementById('profileMessage');

    msg.classList.remove('hidden', 'text-green-600', 'text-red-600');

    try {
        const bodyData = {};
        if (newPass) {
            if (newPass.length < 8 || !/\d/.test(newPass) || !/[@$!%*#?&]/.test(newPass)) {
                msg.innerText = "Password must be 8+ chars, with a number and special character (@$!%*#?&).";
                msg.classList.add('text-red-600');
                return;
            }
            bodyData.password = newPass;
        }

        if (Object.keys(bodyData).length === 0) {
            msg.innerText = "No changes made.";
            msg.classList.add('text-gray-500');
            return;
        }

        const response = await fetch('/api/users/' + user.userId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        if (response.ok) {
            user.mustChangePassword = 0;
            if (localStorage.getItem('nearbites_user')) {
                localStorage.setItem('nearbites_user', JSON.stringify(user));
            } else {
                sessionStorage.setItem('nearbites_user', JSON.stringify(user));
            }

            msg.innerText = "Security updated successfully!";
            msg.classList.add('text-green-600');
            setTimeout(() => {
                closeProfileModal();
                window.location.replace('/seller-dashboard.html');
            }, 1500);
        } else {
            msg.innerText = data.error || "Update failed.";
            msg.classList.add('text-red-600');
        }
    } catch (error) {
        msg.innerText = "Connection error.";
        msg.classList.add('text-red-600');
    }
};

window.logoutUser = function() {
    localStorage.removeItem('nearbites_user');
    sessionStorage.removeItem('nearbites_user');
    window.location.replace('/index.html');
};

// ==========================================
// 6. GLOBAL SEARCH & FILTER LOGIC
// ==========================================
window.globalSearchTags = [];
window.globalSearchInitialized = false; // ⚡ New flag to track if we've loaded the URL

window.renderGlobalTags = function() {
    const container = document.getElementById('globalTagsContainer');
    if(!container) return;
    container.innerHTML = window.globalSearchTags.map((tag, index) => `
        <span class="bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center space-x-1 shadow-sm">
            <span>${tag}</span>
            <button onclick="removeGlobalTag(${index})" class="hover:text-red-900 ml-1">&times;</button>
        </span>
    `).join('');
};

window.removeGlobalTag = function(index) {
    window.globalSearchTags.splice(index, 1);
    window.renderGlobalTags();
};

window.clearAllGlobalTags = function() {
    window.globalSearchTags = [];
    window.renderGlobalTags();
};

window.handleGlobalTagEnter = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('globalSearchTagsInput');
        const val = input.value.trim().toLowerCase();
        if (val && !window.globalSearchTags.includes(val)) {
            window.globalSearchTags.push(val);
            window.renderGlobalTags();
        }
        input.value = '';
    }
};

window.executeGlobalSearch = function() {
    const q = document.getElementById('globalSearchInput').value.trim();
    const price = document.getElementById('globalSearchPrice').value;
    const stars = document.getElementById('globalSearchStars').value;
    const tags = window.globalSearchTags.join(',');
    
    // Build the super-URL!
    let url = '/search-results.html?q=' + encodeURIComponent(q);
    if (price) url += '&price=' + encodeURIComponent(price);
    if (stars && stars !== "0") url += '&stars=' + encodeURIComponent(stars);
    if (tags) url += '&tags=' + encodeURIComponent(tags);
    
    window.location.href = url;
};

window.openGlobalSearch = function() {
    const o = document.getElementById('globalSearchOverlay');
    if (o) {
        // ⚡ HYDRATE THE OVERLAY WITH EXISTING URL PARAMS!
        // This ensures filters are preserved if you click a tag bubble to get here.
        if (!window.globalSearchInitialized) {
            const urlParams = new URLSearchParams(window.location.search);
            
            const existingQ = urlParams.get('q');
            if (existingQ) document.getElementById('globalSearchInput').value = existingQ;
            
            const existingPrice = urlParams.get('price');
            if (existingPrice) document.getElementById('globalSearchPrice').value = existingPrice;
            
            const existingStars = urlParams.get('stars');
            if (existingStars) document.getElementById('globalSearchStars').value = existingStars;

            const existingTags = urlParams.get('tags');
            if (existingTags) {
                window.globalSearchTags = existingTags.split(',').filter(t => t.trim() !== '');
                window.renderGlobalTags();
            }
            
            window.globalSearchInitialized = true;
        }

        o.classList.remove('hidden');
        o.classList.add('flex');
        setTimeout(() => {
            o.classList.remove('opacity-0');
            o.classList.add('opacity-100');
            document.getElementById('globalSearchInput').focus();
        }, 10);
    }
};

window.closeGlobalSearch = function() {
    const o = document.getElementById('globalSearchOverlay');
    if (o) {
        o.classList.remove('opacity-100');
        o.classList.add('opacity-0');
        setTimeout(() => {
            o.classList.remove('flex');
            o.classList.add('hidden');
            // Note: We removed the code that clears the inputs here, 
            // so if they accidentally close the overlay, their typing is saved!
        }, 300);
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGlobalSearch();
});