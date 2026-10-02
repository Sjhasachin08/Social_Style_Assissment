// public/js/admin-users.js

(function () {
  const root = document.getElementById('users-root');
  let currentUserId = null;

  init();

  async function init() {
    const user = await requireAuth({ adminOnly: true });
    if (!user) return;
    currentUserId = user.id;

    try {
      const users = await apiRequest('/api/users');
      render(users);
    } catch {
      root.innerHTML = '<p>Failed to load users.</p>';
    }
  }

  function render(users) {
    const rows = users
      .map((u) => {
        const date = new Date(u.created_at).toLocaleDateString();
        const isSelf = u.id === currentUserId;
        return `
          <tr>
            <td data-label="Name">${escapeHtml(u.name)}</td>
            <td data-label="Email">${escapeHtml(u.email)}</td>
            <td data-label="Role"><span class="style-pill ${u.role === 'admin' ? 'driver' : 'analytical'}">${u.role}</span></td>
            <td data-label="Joined">${date}</td>
            <td data-label="Actions">
              <div class="table-actions">
                <button class="btn btn-secondary btn-sm" data-edit-id="${u.id}">Edit</button>
                <button class="btn btn-danger btn-sm" data-delete-id="${u.id}" ${isSelf ? 'disabled title="You cannot delete your own account"' : ''}>Delete</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');

    root.innerHTML = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    root.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', () => editUser(users.find((u) => u.id === Number(btn.getAttribute('data-edit-id')))));
    });
    root.querySelectorAll('[data-delete-id]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-delete-id')));
    });
  }

  async function editUser(user) {
    if (!user) return;

    const newName = prompt('Name:', user.name);
    if (newName === null) return;
    const newEmail = prompt('Email:', user.email);
    if (newEmail === null) return;
    const newRole = prompt("Role ('admin' or 'user'):", user.role);
    if (newRole === null) return;
    const newPassword = prompt('New password (leave blank to keep unchanged, min 8 characters):', '');
    if (newPassword === null) return;

    if (newPassword && newPassword.length < 8) {
      showToast('Password must be at least 8 characters. No changes were saved.', true);
      return;
    }

    const payload = { name: newName, email: newEmail, role: newRole.trim().toLowerCase() };
    if (newPassword) payload.password = newPassword;

    try {
      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('User updated.');
      init();
    } catch {
      // apiRequest already shows an error toast
    }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user account permanently? Their past assessment results are kept but unlinked.')) return;
    try {
      await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
      showToast('User deleted.');
      init();
    } catch {
      // apiRequest already shows an error toast
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();