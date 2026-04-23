/* ═══════════════════════════════════════════════════════════
   CHD Research Portal — API client
   All communication with the PHP backend goes through here.
   ═══════════════════════════════════════════════════════════ */

const BASE = '/api';

/* ── Core fetch wrapper ── */
async function call(method, endpoint, body) {
  const opts = {
    method,
    credentials: 'include', /* sends session cookie automatically */
  };
  if (body instanceof FormData) {
    opts.body = body; /* let browser set multipart content-type */
  } else if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body    = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}/${endpoint}`, opts);
  } catch {
    throw new Error('Network error — check your connection.');
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Server error (${res.status})`);
  }
  return json.data;
}

/* ── Auth ── */
export const auth = {
  me:       ()                          => call('GET',  'auth.php'),
  login:    (email, password)           => call('POST', 'auth.php', { action:'login',    email, password }),
  register: (name, email, company, phone, password) =>
                                           call('POST', 'auth.php', { action:'register', name, email, company, phone, password }),
  logout:   ()                          => call('POST', 'auth.php', { action:'logout' }),
  upgrade:  ()                          => call('POST', 'auth.php', { action:'upgrade' }),
};

/* ── Reports ── */
export const reports = {
  list:         ()           => call('GET',    'reports.php'),
  create:       (data)       => call('POST',   'reports.php', data),
  update:       (id, data)   => call('PUT',    'reports.php', { id, ...data }),
  remove:       (id)         => call('DELETE', 'reports.php', { id }),
  approve:      (id)         => call('PUT',    'reports.php', { id, status: 'published' }),
  reject:       (id, reason) => call('PUT',    'reports.php', { id, status: 'rejected', rejected_reason: reason }),
  changeAccess: (id, access) => call('PUT',    'reports.php', { id, access }),
};

/* ── Analysts ── */
export const analysts = {
  list:   ()           => call('GET',    'analysts.php'),
  create: (data)       => call('POST',   'analysts.php', data),
  update: (id, data)   => call('PUT',    'analysts.php', { id, ...data }),
  remove: (id)         => call('DELETE', 'analysts.php', { id }),
};

/* ── Bio edits ── */
export const bioEdits = {
  list:    ()               => call('GET',  'bio_edits.php'),
  submit:  (analystId, newBio) => call('POST', 'bio_edits.php', { analystId, newBio }),
  approve: (id)             => call('PUT',  'bio_edits.php', { id, action: 'approve' }),
  reject:  (id)             => call('PUT',  'bio_edits.php', { id, action: 'reject'  }),
};

/* ── Price lists ── */
export const priceLists = {
  list:   ()     => call('GET',    'price_lists.php'),
  create: (data) => call('POST',   'price_lists.php', data),
  remove: (id)   => call('DELETE', 'price_lists.php', { id }),
};

/* ── File uploads ── */
export const upload = {
  photo: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return call('POST', 'upload.php?type=photo', fd);
  },
  pdf: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return call('POST', 'upload.php?type=pdf', fd);
  },
  price: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return call('POST', 'upload.php?type=price', fd);
  },
};

/* ── Research Library ── */
export const library = {
  list:   ()         => call('GET',    'library.php'),
  create: (data)     => call('POST',   'library.php', data),
  update: (id, data) => call('PUT',    'library.php', { id, ...data }),
  remove: (id)       => call('DELETE', 'library.php', { id }),
};

/* ── Funds ── */
export const funds = {
  list:   ()         => call('GET', 'funds.php'),
  update: (id, data) => call('PUT', 'funds.php', { id, ...data }),
};

/* ── Users (Admin Only) ── */
export const users = {
  list:   ()           => call('GET',    'users.php'),
  create: (data)       => call('POST',   'users.php', data),
  update: (id, data)   => call('PUT',    'users.php', { id, ...data }),
  remove: (id)         => call('DELETE', 'users.php', { id }),
};

/* ── Forgot password / OTP ── */
export const forgotPassword = {
  request: (email)                    => call('POST', 'forgot_password.php', { action:'request', email }),
  verify:  (email, otp)               => call('POST', 'forgot_password.php', { action:'verify',  email, otp }),
  reset:   (email, otp, password)     => call('POST', 'forgot_password.php', { action:'reset',   email, otp, password }),
};

/* ── Payments ── */
export const payments = {
  getPublicKey: ()    => call('GET',  'payments.php?action=key'),
  verify:       (ref) => call('POST', 'payments.php', { action: 'verify', ref }),
};
