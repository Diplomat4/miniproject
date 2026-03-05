(function () {
  const SESSION_KEY = 'mk_print_auth_session_v1';
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

  function cloneObj(obj) { return JSON.parse(JSON.stringify(obj || {})); }
  function readUsers() { return cloneObj(usersState); }
  function saveUsers(users) {
    usersState = cloneObj(users);
    setRuntimeUsersToWindow(cloneObj(usersState));
    if (channel) channel.postMessage({ type: 'users:update', from: tabId, users: cloneObj(usersState) });
  }
  function isSeedUser(user) { return !!user && (user.userId === 'empA' || user.userId === 'custA'); }

  function findUserByIdOrRegNo(users, idInput) {
    if (!idInput) return null;
    if (users[idInput]) return users[idInput];
    const normalized = String(idInput).toLowerCase();
    const key = Object.keys(users).find(function (k) {
      const u = users[k] || {};
      return String(k).toLowerCase() === normalized || String(u.registrationNo || '').toLowerCase() === normalized;
    });
    return key ? users[key] : null;
  }

  function seedUsers() {
    const users = readUsers();
    let changed = false;
    if (!users.empA) { users.empA = { userId: 'empA', role: 'employee', name: 'emp A', password: 'ABCD', mobile: '1234567890', email: 'empA@mkprint.com', emailOtp: '2345', mobileOtp: '3456', registrationNo: 'empA', createdAt: Date.now() }; changed = true; }
    if (!users.custA) { users.custA = { userId: 'custA', role: 'customer', name: 'cust A', password: 'PQRS', mobile: '2345678910', email: 'custA@mail.com', emailOtp: '6789', mobileOtp: '7890', registrationNo: 'custA', createdAt: Date.now() }; changed = true; }
    if (users.empA && users.empA.registrationNo !== 'empA') { users.empA.registrationNo = 'empA'; changed = true; }
    if (users.custA && users.custA.registrationNo !== 'custA') { users.custA.registrationNo = 'custA'; changed = true; }
    if (changed) saveUsers(users);
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
  seedUsers();

  const form = document.getElementById('loginForm');
  const msg = document.getElementById('loginMessage');
  const generateOtpBtn = document.getElementById('generateOtpBtn');
  if (!form) return;

  if (generateOtpBtn) {
    generateOtpBtn.addEventListener('click', function () {
      const id = (document.getElementById('loginId').value || '').trim();
      const password = (document.getElementById('loginPassword').value || '').trim();
      if (!id || !password) { msg.style.color = '#dc2626'; msg.textContent = 'Enter ID/Registration No and password first.'; return; }

      const users = readUsers();
      const user = findUserByIdOrRegNo(users, id);
      if (!user || user.password !== password) { msg.style.color = '#dc2626'; msg.textContent = 'Invalid ID/Registration No or password.'; return; }

      const otp = isSeedUser(user) ? String(user.emailOtp || '') : String(Math.floor(1000 + Math.random() * 9000));
      if (!isSeedUser(user)) {
        user.loginOtp = otp;
        users[user.userId] = user;
        saveUsers(users);
      }
      msg.style.color = '#2563eb';
      msg.textContent = 'OTP SENT TO REGISTERED EMAIL: ' + otp;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = (document.getElementById('loginId').value || '').trim();
    const password = (document.getElementById('loginPassword').value || '').trim();
    const otp = (document.getElementById('loginOtp').value || '').trim();
    if (!id || !password || !otp) { msg.style.color = '#dc2626'; msg.textContent = 'All fields are mandatory.'; return; }

    const users = readUsers();
    const user = findUserByIdOrRegNo(users, id);
    const expectedOtp = isSeedUser(user) ? String((user && user.emailOtp) || '') : String((user && user.loginOtp) || '');
    if (!user || user.password !== password || expectedOtp !== otp) { msg.style.color = '#dc2626'; msg.textContent = 'Invalid ID/Registration No, password, or OTP.'; return; }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.userId, role: user.role, name: user.name, loginAt: Date.now() }));
    msg.style.color = '#16a34a';
    msg.textContent = 'Login successful. Redirecting...';
    setTimeout(function () { window.location.href = 'DashboardNew.html'; }, 700);
  });
})();
