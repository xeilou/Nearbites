(() => {
  function getCurrentUser() {
    try {
      const s = localStorage.getItem('nearbites_user') || sessionStorage.getItem('nearbites_user');
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('nearbites_user');
    sessionStorage.removeItem('nearbites_user');
    window.location.href = '/index.html';
  }

  function buildNavbar() {
    const mount = document.getElementById('nearbites-navbar');
    if (!mount) return;

    const user = getCurrentUser();

    const nav = document.createElement('nav');
    nav.className = 'bg-white shadow-sm border-b border-gray-100 px-6 py-3';

    const inner = document.createElement('div');
    inner.className = 'max-w-7xl mx-auto flex items-center justify-between';

    const left = document.createElement('div');
    left.className = 'flex items-center space-x-4';
    left.innerHTML = `
      <a href="/index.html" class="text-2xl font-extrabold text-red-700 tracking-tight">Nearbites</a>
    `;

    const right = document.createElement('div');
    right.className = 'flex items-center space-x-4';

    const links = document.createElement('div');
    links.className = 'hidden md:flex items-center space-x-3';

    const makeLink = (text, href) => {
      const a = document.createElement('a');
      a.href = href;
      a.className = 'text-gray-700 hover:text-red-700 font-medium';
      a.innerText = text;
      return a;
    };

    links.appendChild(makeLink('Menu', '/student-dashboard.html'));
    links.appendChild(makeLink('For Sellers', '/seller-dashboard.html'));
    links.appendChild(makeLink('Admin', '/admin-dashboard.html'));

    right.appendChild(links);

    const profileWrap = document.createElement('div');
    profileWrap.className = 'flex items-center space-x-3';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'hidden md:inline text-gray-700 font-semibold';
    nameSpan.innerText = user ? `${user.username}` : 'Guest';

    const profileBtn = document.createElement('button');
    profileBtn.className = 'text-sm text-gray-500 hover:text-red-700';
    profileBtn.innerText = 'Profile';
    profileBtn.addEventListener('click', openProfileModal);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'text-sm font-semibold text-gray-500 hover:text-red-700';
    logoutBtn.innerText = 'Logout';
    logoutBtn.addEventListener('click', logout);

    profileWrap.appendChild(nameSpan);
    profileWrap.appendChild(profileBtn);
    profileWrap.appendChild(logoutBtn);
    right.appendChild(profileWrap);

    // Mobile hamburger
    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'md:hidden text-gray-700';
    mobileBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>';

    let mobileOpen = false;
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'md:hidden mt-2 hidden flex-col space-y-2';
    mobileMenu.appendChild(makeLink('Menu', '/student-dashboard.html'));
    mobileMenu.appendChild(makeLink('For Sellers', '/seller-dashboard.html'));
    mobileMenu.appendChild(makeLink('Admin', '/admin-dashboard.html'));

    mobileBtn.addEventListener('click', () => {
      mobileOpen = !mobileOpen;
      mobileMenu.classList.toggle('hidden', !mobileOpen);
    });

    inner.appendChild(left);
    inner.appendChild(right);
    inner.appendChild(mobileBtn);

    nav.appendChild(inner);
    mount.replaceWith(nav);
    nav.after(mobileMenu);
  }

  // Expose utilities for pages
  window.Nearbites = window.Nearbites || {};
  window.Nearbites.getCurrentUser = getCurrentUser;
  window.Nearbites.logout = logout;
  window.Nearbites.renderNavbar = buildNavbar;

  document.addEventListener('DOMContentLoaded', () => {
    buildNavbar();
  });

  // Simple profile modal
  function openProfileModal() {
    const user = getCurrentUser();
    if (!user) return window.location.replace('/index.html');

    // If modal exists, show and populate
    let modal = document.getElementById('nb-profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'nb-profile-modal';
      modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-md">
          <h3 class="text-lg font-bold mb-2">Profile</h3>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-700">Username</label>
              <input id="nb-profile-username" class="w-full mt-1 px-3 py-2 border rounded" />
            </div>
            <div>
              <label class="text-sm text-gray-700">Email</label>
              <input id="nb-profile-email" class="w-full mt-1 px-3 py-2 border rounded" disabled />
            </div>
            <div class="flex justify-between items-center">
              <button id="nb-profile-save" class="bg-red-700 text-white px-4 py-2 rounded">Save</button>
              <div class="space-x-2">
                <a href="/change-password.html" class="text-sm text-gray-600 hover:underline">Change password</a>
                <button id="nb-profile-close" class="text-sm text-gray-600">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('nb-profile-close').addEventListener('click', () => modal.remove());
      document.getElementById('nb-profile-save').addEventListener('click', async () => {
        const newName = document.getElementById('nb-profile-username').value.trim();
        if (!newName) return alert('Username cannot be empty');
        try {
          const res = await fetch('/api/users/' + user.userId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newName }) });
          const j = await res.json();
          if (!res.ok) return alert(j.error || 'Failed to update');
          // Update local storage/session
          const raw = localStorage.getItem('nearbites_user') ? localStorage.getItem('nearbites_user') : sessionStorage.getItem('nearbites_user');
          if (raw) {
            try { const obj = JSON.parse(raw); obj.username = newName; if (localStorage.getItem('nearbites_user')) localStorage.setItem('nearbites_user', JSON.stringify(obj)); else sessionStorage.setItem('nearbites_user', JSON.stringify(obj)); } catch(e){}
          }
          modal.remove();
          buildNavbar();
        } catch (err) { console.error(err); alert('Error updating profile'); }
      });
    }

    // populate
    document.getElementById('nb-profile-username').value = user.username || '';
    document.getElementById('nb-profile-email').value = user.email || '';
    modal.style.display = 'flex';
  }
})();
