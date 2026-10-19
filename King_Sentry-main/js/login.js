
const PRESET_ACCOUNTS = {
  admin: {
    email: 'aris.evans@kingsentry.ph',
    password: 'Password2026!',
    name: 'Dr. Aris Evans',
    role: 'ADMIN',
    zone: 'All Orchard Zones',
    id: 'USR-001'
  },
  agronomist: {
    email: 'm.santos@kingsentry.ph',
    password: 'Password2026!',
    name: 'Maria Leonor Santos, MSc',
    role: 'AGRONOMIST',
    zone: 'Zone B - River Basin',
    id: 'USR-002'
  },
  farmer: {
    email: 'jun.perez@kingsentry.ph',
    password: 'Password2026!',
    name: "Regalado 'Jun' Perez",
    role: 'FARMER',
    zone: 'Zone A - Upper Slope',
    id: 'USR-004'
  }
};

let currentSelectedRole = 'admin';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordEyeIcon = document.getElementById('passwordEyeIcon');
  const rememberCheckbox = document.getElementById('rememberCheckbox');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');
  const activeRoleBadge = document.getElementById('activeRoleBadge');

  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const forgotModal = document.getElementById('forgotModal');
  const closeForgotModalBtn = document.getElementById('closeForgotModalBtn');
  const resetPassSubmitBtn = document.getElementById('resetPassSubmitBtn');
  const resetEmailInput = document.getElementById('resetEmailInput');
  const resetSuccessAlert = document.getElementById('resetSuccessAlert');

  const roleButtons = document.querySelectorAll('.role-pill-btn');

  function selectRolePreset(roleKey) {
    currentSelectedRole = roleKey;
    const acc = PRESET_ACCOUNTS[roleKey];
    if (!acc) return;

    if (roleButtons) {
      roleButtons.forEach(b => {
        if (b.getAttribute('data-role') === roleKey) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    if (emailInput) emailInput.value = acc.email;
    if (passwordInput) passwordInput.value = acc.password;

    if (activeRoleBadge) {
      activeRoleBadge.textContent = `${acc.role} • ${acc.name}`;
    }
  }

  roleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const roleKey = btn.getAttribute('data-role');
      if (roleKey && PRESET_ACCOUNTS[roleKey]) {
        selectRolePreset(roleKey);
      }
    });
  });

  const rememberedEmail = localStorage.getItem('kingsentry_remembered_email');
  if (rememberedEmail && emailInput) {
    emailInput.value = rememberedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      
      if (passwordEyeIcon) {
        passwordEyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        alert("Palihug butangi og email ug password.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitSpinner) submitSpinner.classList.remove('hidden');
      if (submitBtnText) submitBtnText.textContent = 'Authenticating...';

      try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Login failed");
        }

        localStorage.setItem('kingsentry_current_user', JSON.stringify({
            email: data.user.email,
            role: data.profile.role,
            username: data.profile.username
        }));

        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem('kingsentry_remembered_email', email);
        }

        window.location.href = 'dashboard.html';

      } catch (error) {
        alert("Error: " + error.message);
        
        if (submitBtn) submitBtn.disabled = false;
        if (submitSpinner) submitSpinner.classList.add('hidden');
        if (submitBtnText) submitBtnText.textContent = 'Sign In to Orchard Station';
      }
    });
  }
 
  if (forgotPasswordLink && forgotModal) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.classList.remove('hidden');
      if (resetSuccessAlert) resetSuccessAlert.classList.add('hidden');
      if (resetEmailInput && emailInput) resetEmailInput.value = emailInput.value;
    });
  }

  if (closeForgotModalBtn && forgotModal) {
    closeForgotModalBtn.addEventListener('click', () => {
      forgotModal.classList.add('hidden');
    });
  }

  if (resetPassSubmitBtn && resetEmailInput) {
    resetPassSubmitBtn.addEventListener('click', () => {
      const email = resetEmailInput.value.trim() || 'operator@kingsentry.ph';
      if (resetSuccessAlert) {
        resetSuccessAlert.classList.remove('hidden');
        resetSuccessAlert.textContent = `Password reset simulated for ${email}. Default demo password remains: Password2026!`;
      }
      setTimeout(() => {
        if (forgotModal) forgotModal.classList.add('hidden');
      }, 1800);
    });
  }

  if (window.lucide) {
    lucide.createIcons();
  }
});
