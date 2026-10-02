// public/js/app.js
// Shared helpers used across pages.

function showToast(message, isError) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3200);
}

async function apiRequest(url, options) {
  try {
    const res = await fetch(url, Object.assign({ credentials: 'include' }, options));
    let body;
    try {
      body = await res.json();
    } catch {
      body = { success: false, message: 'Unexpected server response.' };
    }
    if (!res.ok || body.success === false) {
      throw new Error(body.message || `Request failed (${res.status})`);
    }
    return body.data;
  } catch (err) {
    showToast(err.message || 'Something went wrong. Please try again.', true);
    throw err;
  }
}

// Silent variant used for auth checks — a 401 there is expected (logged out)
// and shouldn't pop an error toast on every page load.
async function apiRequestSilent(url, options) {
  const res = await fetch(url, Object.assign({ credentials: 'include' }, options));
  let body;
  try {
    body = await res.json();
  } catch {
    body = { success: false };
  }
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return body.data;
}

async function getCurrentUser() {
  try {
    return await apiRequestSilent('/api/auth/me');
  } catch {
    return null;
  }
}

/**
 * Call at the top of any page that requires login. Redirects to /login
 * (or shows an "admin only" message) when the check fails.
 */
async function requireAuth({ adminOnly = false } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  if (adminOnly && user.role !== 'admin') {
    document.body.innerHTML = '<main class="container"><p style="padding:40px 0;">Admin access is required to view this page.</p></main>';
    return null;
  }
  return user;
}

async function logout() {
  try {
    await apiRequestSilent('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  window.location.href = '/login';
}

/**
 * Fills in the shared navbar with login/signup links or the current
 * user's name + logout + (for admins) a Users link. Safe to call on
 * every page; does nothing if the page has no #nav-links element.
 */
async function renderNavAuth() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  const user = await getCurrentUser();

  // No public signup/login here — regular participants never have accounts.
  // Only an admin session shows the reports/users links + logout. Everyone
  // else just sees a quiet "Admin" link to reach /login.
  const authHtml = user
    ? `<a href="/history">Reports</a>
       ${user.role === 'admin' ? '<a href="/admin/users">Users</a>' : ''}
       <span class="nav-user">${escapeHtmlNav(user.name)}</span>
       <a href="#" id="nav-logout">Logout</a>`
    : `<a href="/login" class="nav-admin-link">Admin</a>`;

  nav.innerHTML = `<a href="/">Home</a>${authHtml}`;

  const logoutLink = document.getElementById('nav-logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

function escapeHtmlNav(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function styleClass(styleName) {
  return (styleName || '').toLowerCase();
}

document.addEventListener('DOMContentLoaded', renderNavAuth);
