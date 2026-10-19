
async function renderUsers() {
  const usersBody = document.getElementById('usersTableBody');
  if (!usersBody) return;

  usersBody.innerHTML = `
    <tr>
      <td colspan="6" class="py-12 text-center text-slate-400 text-sm">
        Walay users nga nakita sa database.
      </td>
    </tr>
  `;

  document.getElementById('adminCount').textContent = "0 Accounts";
  document.getElementById('agronomistCount').textContent = "0 Accounts";
  document.getElementById('farmerCount').textContent = "0 Accounts";
}
function removeUser(userId) {
  const idx = state.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    const removed = state.users.splice(idx, 1)[0];
    renderUsers();
    showToast(`Deactivated account for ${removed.name}`, 'Leaf Spot');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderUsers();

  const openRegisterUserBtn = document.getElementById('openRegisterUserBtn');
  const userModal           = document.getElementById('userModal');
  const closeUserModal      = document.getElementById('closeUserModal');
  const cancelUserBtn       = document.getElementById('cancelUserBtn');
  const userForm            = document.getElementById('userForm');

  openRegisterUserBtn?.addEventListener('click', () => {
    userForm?.reset();
    userModal?.classList.remove('hidden');
  });

  const hideUserModal = () => userModal?.classList.add('hidden');
  closeUserModal?.addEventListener('click', hideUserModal);
  cancelUserBtn?.addEventListener('click', hideUserModal);

  userForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = document.getElementById('userFullName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role  = document.getElementById('userRole').value;
    const zone  = document.getElementById('userZone').value;

    const newUser = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name,
      email,
      role,
      zone,
      status: "Active",
      created: "Just now"
    };

    state.users.push(newUser);
    hideUserModal();
    renderUsers();
    showToast(`Registered new ${role}: ${name}`, 'Healthy');
  });
});
