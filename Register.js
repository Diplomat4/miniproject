(function () {
  const LIVE_CHANNEL = 'mk_print_live_auth_query_v1';
  const WINDOW_NAME_KEY = '__mk_runtime_state_v1__';
  const tabId = 'tab_' + Math.random().toString(36).slice(2, 10);
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(LIVE_CHANNEL) : null;
  function readWindowState() {
    try { return JSON.parse(window.name || '{}') || {}; } catch (_e) { return {}; }
  }
  function writeWindowState(next) {
    try { window.name = JSON.stringify(next || {}); } catch (_e) {}
  }
  function getRuntimeUsersFromWindow() {
    const state = readWindowState();
    return state && state[WINDOW_NAME_KEY] && state[WINDOW_NAME_KEY].users ? state[WINDOW_NAME_KEY].users : {};
  }
  function setRuntimeUsersToWindow(users) {
    const state = readWindowState();
    state[WINDOW_NAME_KEY] = state[WINDOW_NAME_KEY] || {};
    state[WINDOW_NAME_KEY].users = users || {};
    writeWindowState(state);
  }
  let usersState = getRuntimeUsersFromWindow();
  const form = document.getElementById('registerForm');
  const msg = document.getElementById('registerMessage');
  const registerBtn = document.getElementById('registerBtn');
  const sendMobileOtpBtn = document.getElementById('sendMobileOtpBtn');
  const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');
  const regType = document.getElementById('regType');
  const regUserId = document.getElementById('regUserId');
  const regName = document.getElementById('regName');
  const regMobile = document.getElementById('regMobile');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const regMobileOtp = document.getElementById('regMobileOtp');
  const regEmailOtp = document.getElementById('regEmailOtp');
  let sentMobileOtp = '';
  let sentEmailOtp = '';
  function cloneObj(obj) { return JSON.parse(JSON.stringify(obj || {})); }
  function readUsers() { return cloneObj(usersState); }
  function saveUsers(users) {
    usersState = cloneObj(users);
    setRuntimeUsersToWindow(cloneObj(usersState));
    if (channel) channel.postMessage({ type: 'users:update', from: tabId, users: cloneObj(usersState) });
  }
  if (channel) {
    channel.onmessage = function (evt) {
      const msg = (evt && evt.data) || {};
      if (!msg || msg.from === tabId) return;
      if (msg.type === 'users:update') {
        usersState = cloneObj(msg.users);
        setRuntimeUsersToWindow(cloneObj(usersState));
      }
      if (msg.type === 'users:request') channel.postMessage({ type: 'users:response', from: tabId, to: msg.from, users: cloneObj(usersState) });
      if (msg.type === 'users:response' && msg.to === tabId) {
        const incoming = cloneObj(msg.users);
        if (Object.keys(incoming).length > Object.keys(usersState).length) {
          usersState = incoming;
          setRuntimeUsersToWindow(cloneObj(usersState));
        }
      }
    };
    channel.postMessage({ type: 'users:request', from: tabId });
  }
  function randomOtp() { return String(Math.floor(1000 + Math.random() * 9000)); }
  function randomRegNo() { const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let code=''; for(let i=0;i<8;i++) code += chars[Math.floor(Math.random()*chars.length)]; return code; }
  function allRequiredFilled() { return regType.value && regUserId.value.trim() && regName.value.trim() && regMobile.value.trim() && regEmail.value.trim() && regPassword.value.trim() && regMobileOtp.value.trim() && regEmailOtp.value.trim(); }
  function updateRegisterState() { const verified = regMobileOtp.value.trim() === sentMobileOtp && regEmailOtp.value.trim() === sentEmailOtp && !!sentMobileOtp && !!sentEmailOtp; registerBtn.disabled = !(allRequiredFilled() && verified); }
  [regType, regUserId, regName, regMobile, regEmail, regPassword, regMobileOtp, regEmailOtp].forEach(function (el) { el.addEventListener('input', updateRegisterState); el.addEventListener('change', updateRegisterState); });
  sendMobileOtpBtn.addEventListener('click', function () { if (!regMobile.value.trim()) { msg.style.color = '#dc2626'; msg.textContent = 'Enter mobile number first.'; return; } sentMobileOtp = randomOtp(); msg.style.color = '#2563eb'; msg.textContent = 'Mobile OTP sent: ' + sentMobileOtp; updateRegisterState(); });
  sendEmailOtpBtn.addEventListener('click', function () { if (!regEmail.value.trim()) { msg.style.color = '#dc2626'; msg.textContent = 'Enter email first.'; return; } sentEmailOtp = randomOtp(); msg.style.color = '#2563eb'; msg.textContent = 'Email OTP sent: ' + sentEmailOtp; updateRegisterState(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    updateRegisterState();
    if (registerBtn.disabled) { msg.style.color = '#dc2626'; msg.textContent = 'Complete all mandatory fields and OTP verification.'; return; }
    const users = readUsers();
    const userId = regUserId.value.trim();
    if (users[userId]) { msg.style.color = '#dc2626'; msg.textContent = 'User ID already registered.'; return; }
    const regNo = randomRegNo();
    users[userId] = { userId, role: regType.value, name: regName.value.trim(), mobile: regMobile.value.trim(), email: regEmail.value.trim(), password: regPassword.value.trim(), mobileOtp: sentMobileOtp, emailOtp: sentEmailOtp, registrationNo: regNo, createdAt: Date.now() };
    saveUsers(users);
    msg.style.color = '#16a34a';
    msg.textContent = 'Registration successful.';
    const successUrl = 'RegistrationSuccess.html?regNo=' + encodeURIComponent(regNo);
    window.location.href = successUrl;
  });
})();
