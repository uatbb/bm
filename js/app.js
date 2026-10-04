/* ===== الموقع العام: صفحة تحميل المتعامل فقط ===== */
(function () {
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => I18N.t(k, v);

  function applyDir() {
    document.documentElement.lang = I18N.lang;
    document.documentElement.dir = I18N.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('univ') + ' — ' + t('p_download_sub');
  }

  function neutralHeader() {
    return (
      '<div class="flex items-center justify-between mb-3">' +
      '<span class="text-[11px] font-bold bg-white/15 rounded-full px-3 py-1">' + t('office') + '</span>' +
      '<button id="p-lang-btn" type="button" class="text-[11px] font-bold bg-white/15 hover:bg-white/25 rounded-full px-3 py-1 transition">' +
      (I18N.lang === 'ar' ? '🇫🇷 Français' : '🇩🇿 العربية') + '</button>' +
      '</div>'
    );
  }

  function neutral(inner) {
    return (
      '<div>' +
      '<div class="bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-700 text-white px-5 pt-4 pb-12 rounded-b-3xl shadow-md relative z-10 overflow-hidden">' +
      '<div class="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none"></div>' +
      '<div class="absolute -bottom-24 -right-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none"></div>' +
      '<div class="relative">' + neutralHeader() + '</div>' +
      '<div class="relative flex flex-col items-center text-center">' +
      '<img src="img/logo.png" alt="" class="h-16 w-16 object-contain mb-3 bg-white rounded-2xl p-2 shadow-lg">' +
      '<h1 class="text-base sm:text-lg font-black leading-snug">' + t('univ') + '</h1>' +
      '<p class="text-[11px] text-primary-100 mt-1.5 font-semibold">' + t('p_download_sub') + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-6 text-start -mt-7 relative z-20">' + inner + '</div>' +
      '</div>'
    );
  }

  function renderNeutralNoQR() {
    $('public-root').innerHTML = neutral(
      '<div class="text-center py-4">' +
      '<div class="text-5xl mb-3">📄</div>' +
      '<p class="text-sm text-slate-500 leading-relaxed">' + t('neutral_noqr') + '</p>' +
      '<p class="text-xs text-slate-400 mt-2 leading-relaxed">' + t('neutral_noqr_s') + '</p>' +
      '</div>'
    );
  }

  function renderNeutralNoDB() {
    $('public-root').innerHTML = neutral(
      '<div class="text-center py-4">' +
      '<div class="text-5xl mb-3">⚙️</div>' +
      '<p class="text-sm text-slate-500">' + t('neutral_nodb') + '</p>' +
      '</div>'
    );
  }

  // رمز قصير (?c=012026) → إيجاد الاستشارة من أرقام مرجعها في العرض العام
  function resolveByCode(code) {
    const root = $('public-root');
    root.innerHTML = neutral('<div class="text-center py-6"><div class="spinner my-4"></div></div>');
    DB.from('tenders_public')
      .select('id, reference, opening_date, secure_link')
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          root.innerHTML = neutral(
            '<div class="text-center py-4"><div class="text-5xl mb-3">⚙️</div>' +
            '<p class="text-sm text-slate-500">' + t('neutral_nodb') + '</p></div>'
          );
          return;
        }
        const matches = (data || []).filter((r) => !r.secure_link && (r.reference || '').replace(/\D/g, '') === code);
        if (!matches.length) {
          window.DownloadPage.init('__invalid__');
          return;
        }
        matches.sort((a, b) => String(b.opening_date || '').localeCompare(String(a.opening_date || '')));
        window.DownloadPage.init(matches[0].id);
      });
  }

  function bindLangToggle() {
    $('public-root').addEventListener('click', (e) => {
      if (!e.target.closest('#p-lang-btn')) return;
      if (window.DownloadPage && window.DownloadPage.view) return; // download.js يتولى الزر
      I18N.setLang(I18N.other());
      applyDir();
      neutralRefresh();
    });
  }

  /* ---------- تقويم الفتح العام (?cal=1) ---------- */

  const P_MONTHS_AR = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const P_MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  let calCursor = new Date();
  let calMode = false;

  function renderPublicCal(root) {
    const cur = calCursor || new Date();
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const isAr = I18N.lang === 'ar';
    root.innerHTML =
      '<div class="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">' +
      '<div class="flex items-center justify-between mb-3">' +
      '<button id="pcal-prev" type="button" class="w-8 h-8 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-800 font-black text-lg leading-none">‹</button>' +
      '<div class="text-center">' +
      '<div class="font-black text-slate-800 text-sm">' + t('cal_title') + '</div>' +
      '<div id="pcal-month" class="text-xs font-bold text-primary-700 mt-0.5"></div>' +
      '</div>' +
      '<button id="pcal-next" type="button" class="w-8 h-8 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-800 font-black text-lg leading-none">›</button>' +
      '</div>' +
      '<div id="pcal-grid" class="grid grid-cols-7 gap-1"></div>' +
      '</div>';
    $('pcal-month').textContent = (isAr ? P_MONTHS_AR : P_MONTHS_FR)[m] + ' ' + y;
    const grid = $('pcal-grid');
    grid.innerHTML = '<div class="col-span-7 text-center text-slate-400 text-xs py-6"><div class="spinner my-2"></div></div>';
    const start = new Date(y, m, 1).toISOString();
    const end = new Date(y, m + 1, 1).toISOString();
    DB.from('tenders_public').select('id, reference, title, opening_date, status')
      .gte('opening_date', start)
      .lt('opening_date', end)
      .then(({ data, error }) => {
        if (error) {
          grid.innerHTML = '<div class="col-span-7 text-center text-slate-400 text-xs py-6">⚠️</div>';
          return;
        }
        const byDay = {};
        (data || []).forEach((tt) => {
          const d = new Date(tt.opening_date).getDate();
          (byDay[d] = byDay[d] || []).push(tt);
        });
        const first = new Date(y, m, 1).getDay();
        const daysIn = new Date(y, m + 1, 0).getDate();
        const today = new Date();
        const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
        let html = '';
        for (let w = 0; w < 7; w++) html += '<div class="text-center text-[10px] font-bold text-slate-400 py-1">' + t('cal_wd' + w) + '</div>';
        for (let b = 0; b < first; b++) html += '<div></div>';
        for (let d = 1; d <= daysIn; d++) {
          const items = byDay[d] || [];
          let chips = '';
          items.slice(0, 2).forEach((tt) => {
            const done = tt.status === 'opened';
            chips += '<div class="flex items-center gap-1 text-[10px] font-bold truncate rounded-md px-1 py-0.5 ' + (done ? 'bg-slate-100 text-slate-400 line-through' : 'bg-primary-50 text-primary-800') + '" title="' + tt.reference + ' — ' + (tt.title || '') + '">' +
              '<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:' + (done ? '#94a3b8' : '#047857') + '"></span>' +
              '<span class="truncate">' + tt.reference + '</span></div>';
          });
          if (items.length > 2) chips += '<div class="text-[9px] text-slate-400 font-bold">+' + (items.length - 2) + '</div>';
          html += '<div class="min-h-[52px] rounded-lg border p-1 ' + (isToday(d) ? 'border-primary-400 bg-primary-50/60' : 'border-slate-100') + '">' +
            '<div class="text-[10px] font-bold ' + (isToday(d) ? 'text-primary-700' : 'text-slate-400') + '">' + d + (isToday(d) ? ' ' + t('cal_today') : '') + '</div>' +
            chips +
            '</div>';
        }
        grid.innerHTML = html;
      });
    $('pcal-prev').addEventListener('click', () => {
      calCursor = new Date(cur.getFullYear(), m - 1, 1);
      renderPublicCal(root);
    });
    $('pcal-next').addEventListener('click', () => {
      calCursor = new Date(cur.getFullYear(), m + 1, 1);
      renderPublicCal(root);
    });
  }

  let neutralMode = null;
  function neutralRefresh() {
    if (neutralMode === 'noqr') renderNeutralNoQR();
    else if (neutralMode === 'nodb') renderNeutralNoDB();
  }
  document.addEventListener('langchange', () => {
    if (calMode) renderPublicCal($('public-root'));
  });

  function boot() {
    I18N.init();
    applyDir();

    let db = null;
    try {
      db = initSupabase();
    } catch (e) {
      console.error(e);
    }

    if (!db) {
      neutralMode = 'nodb';
      renderNeutralNoDB();
      bindLangToggle();
      return;
    }

    bindLangToggle();

    const params = new URLSearchParams(location.search);
    const token = params.get('open');
    const code = params.get('c');

    if (token) {
      window.DownloadPage.init(token);
    } else if (code) {
      resolveByCode(code);
    } else if (params.get('cal')) {
      calMode = true;
      renderPublicCal($('public-root'));
    } else {
      neutralMode = 'noqr';
      renderNeutralNoQR();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
