document.documentElement.classList.add('page-enter');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileMenu = window.matchMedia('(max-width: 700px)');
const dialogs = [...document.querySelectorAll('dialog')];
const dialogState = new WeakMap();
const menuDialog = document.querySelector('#menu-dialog');
const menuTrigger = document.querySelector('.menu-toggle');
const searchTrigger = document.querySelector('.search-toggle');
const groupButtons = [...document.querySelectorAll('[data-menu-group]')];
const menuPanels = [...document.querySelectorAll('[data-menu-panel]')];
const panelHost = document.querySelector('.mega-panels');
const section = document.querySelector('.site-header')?.dataset.section;
let activeMenuGroup = section === 'about' || section === 'people' ? 'who' : section === 'projects' ? 'impact' : 'what';

function selectMenuGroup(group, allowCollapse = false) {
  const selected = allowCollapse && group === activeMenuGroup ? null : group;
  activeMenuGroup = selected;
  groupButtons.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.menuGroup === selected)));
  menuPanels.forEach(panel => {
    panel.hidden = panel.dataset.menuPanel !== selected;
    panel.classList.remove('panel-enter');
    if (!panel.hidden) {
      void panel.offsetWidth;
      panel.classList.add('panel-enter');
    }
  });
}
function arrangeMenu() {
  menuPanels.forEach(panel => {
    if (mobileMenu.matches) groupButtons.find(b => b.dataset.menuGroup === panel.dataset.menuPanel).after(panel);
    else panelHost.append(panel);
  });
  if (!mobileMenu.matches && !activeMenuGroup) activeMenuGroup = 'what';
  selectMenuGroup(activeMenuGroup);
}
arrangeMenu();
mobileMenu.addEventListener('change', arrangeMenu);
groupButtons.forEach((button, i) => {
  button.addEventListener('click', () => selectMenuGroup(button.dataset.menuGroup, mobileMenu.matches));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown') next = (i + 1) % groupButtons.length;
    if (event.key === 'ArrowUp') next = (i - 1 + groupButtons.length) % groupButtons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = groupButtons.length - 1;
    if (next !== undefined) { event.preventDefault(); groupButtons[next].focus(); selectMenuGroup(groupButtons[next].dataset.menuGroup); }
    if (event.key === 'ArrowRight') {
      event.preventDefault(); selectMenuGroup(button.dataset.menuGroup);
      document.querySelector(`#${button.getAttribute('aria-controls')} a`)?.focus();
    }
  });
});
menuPanels.forEach(panel => panel.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault(); groupButtons.find(b => b.dataset.menuGroup === panel.dataset.menuPanel)?.focus();
  }
}));

// Native dialog retains focus containment. Closing finishes before focus returns.
function openDialog(id) {
  const dialog = document.querySelector(id);
  if (!dialog || dialog.open) return;
  dialogs.filter(d => d.open).forEach(d => d.close());
  const opener = id === '#menu-dialog' ? menuTrigger : searchTrigger;
  dialogState.set(dialog, { opener });
  dialog.classList.remove('is-closing', 'is-visible');
  dialog.showModal();
  document.documentElement.classList.add('dialog-open');
  opener?.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => { if (dialog.open && !dialog.classList.contains('is-closing')) dialog.classList.add('is-visible'); }));
  const focusTarget = dialog.querySelector('input') || groupButtons.find(b => b.dataset.menuGroup === activeMenuGroup) || dialog.querySelector('[data-close]');
  focusTarget?.focus({ preventScroll: true });
}
function closeDialog(dialog, restoreFocus = true) {
  if (!dialog?.open) return Promise.resolve();
  const state = dialogState.get(dialog) || {};
  if (state.closing) return state.closing;
  dialog.classList.add('is-closing');
  dialog.classList.remove('is-visible');
  state.closing = new Promise(resolve => {
    setTimeout(() => {
      if (dialog.open) dialog.close();
      dialog.classList.remove('is-closing');
      if (restoreFocus) state.opener?.focus({ preventScroll: true });
      state.closing = null;
      resolve();
    }, motionPreference.matches ? 0 : 180);
  });
  dialogState.set(dialog, state);
  return state.closing;
}
menuTrigger?.addEventListener('click', () => openDialog('#menu-dialog'));
searchTrigger?.addEventListener('click', () => openDialog('#search-dialog'));
dialogs.forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('close', () => {
    dialogState.get(dialog)?.opener?.setAttribute('aria-expanded', 'false');
    if (!dialogs.some(d => d.open)) document.documentElement.classList.remove('dialog-open');
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
  });
});

// Exact destination highlights keep project filter links distinct.
const destinationKey = value => {
  const url = new URL(value, location.href);
  url.searchParams.sort();
  return url.pathname.replace(/\/$/, '') + url.search;
};
const currentKey = destinationKey(location.href);
document.querySelectorAll('#menu-dialog a, .site-footer a, .help-link').forEach(a => {
  if (a.origin === location.origin && destinationKey(a.href) === currentKey && !a.hash) a.setAttribute('aria-current', 'page');
});

// Preserve real links, browser history and modifier-click behaviour.
const transitionReset = () => {
  document.documentElement.classList.remove('nav-pending');
  document.querySelector('main')?.removeAttribute('aria-busy');
  document.querySelectorAll('[data-navigating]').forEach(a => a.removeAttribute('data-navigating'));
};
window.addEventListener('pageshow', event => {
  transitionReset();
  if (event.persisted) {
    document.documentElement.classList.remove('page-enter');
    dialogs.filter(d => d.open).forEach(d => d.close());
    document.documentElement.classList.remove('dialog-open');
  }
});
window.addEventListener('pagehide', transitionReset);
document.addEventListener('click', async event => {
  const anchor = event.target.closest?.('a[href]');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol) || /\.(pdf|mp4|webm)$/i.test(url.pathname)) return;
  const dialog = anchor.closest('dialog');
  if (url.pathname === location.pathname && url.search === location.search) {
    event.preventDefault();
    if (dialog) await closeDialog(dialog, false);
    if (url.hash) {
      let target;
      try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
      if (!target) return;
      if (location.hash !== url.hash) history.pushState(null, '', url.hash);
      target.scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true }); }
      target.focus({ preventScroll: true });
    }
    return;
  }
  anchor.setAttribute('data-navigating', 'true');
  document.documentElement.classList.add('nav-pending');
  document.querySelector('main')?.setAttribute('aria-busy', 'true');
  // Reset if a browser blocks or cancels navigation; never disable the link.
  setTimeout(transitionReset, 4000);
});

const tabs = [...document.querySelectorAll('[data-expertise]')];
const expertiseHover = window.matchMedia('(hover: hover) and (pointer: fine)');
let expertiseHoverTimer;
function selectTab(button, focus = false) {
  clearTimeout(expertiseHoverTimer);
  if (button.getAttribute('aria-selected') === 'true') {
    if (focus) button.focus();
    return;
  }
  tabs.forEach(tab => {
    tab.setAttribute('aria-selected', String(tab === button));
    tab.tabIndex = tab === button ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = tab !== button;
    panel.classList.remove('panel-enter');
    if (!panel.hidden) { void panel.offsetWidth; panel.classList.add('panel-enter'); }
  });
  if (focus) button.focus();
}
tabs.forEach((button, i) => {
  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !expertiseHover.matches) return;
    const previewImage = document.getElementById(button.getAttribute('aria-controls')).querySelector('img');
    if (previewImage) previewImage.loading = 'eager';
    clearTimeout(expertiseHoverTimer);
    expertiseHoverTimer = setTimeout(() => selectTab(button), 110);
  });
  button.addEventListener('pointerleave', () => clearTimeout(expertiseHoverTimer));
  button.addEventListener('click', () => selectTab(button));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
  });
});
const header=document.querySelector('.site-header');
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>20),{passive:true});
const search=document.querySelector('#site-search');
let searchIndex;
const results=document.querySelector('#search-results');
const searchReady=fetch(new URL('search-index.json', new URL('.', document.currentScript.src))).then(r=>r.json()).then(data=>{searchIndex=data;}).catch(()=>{results.textContent='Search is unavailable. Explore the site using the menu.';});
async function searchSite(){await searchReady;if(!searchIndex)return;results.replaceChildren();const q=search.value.trim().toLowerCase();const found=searchIndex.filter(x=>!q||`${x.title} ${x.text}`.toLowerCase().includes(q)).slice(0,12);const count=document.createElement('p');count.className='search-count';count.textContent=q?`${found.length} matching results`:'Explore our services, projects and people';results.append(count);found.forEach(x=>{const a=document.createElement('a');a.href=x.url;const small=document.createElement('small');small.textContent=x.type;const span=document.createElement('span');span.textContent=x.title;a.append(small,span);results.append(a);});if(!found.length){const p=document.createElement('p');p.textContent='No matches found. Try “energy”, “structures” or a project name.';results.append(p);}}
search?.addEventListener('input',searchSite);document.querySelector('.search-toggle')?.addEventListener('click',searchSite);

const serviceSelect = document.querySelector('#service-filter');
if (serviceSelect) {
  const params = new URLSearchParams(location.search);
  let status = ['all', 'ongoing', 'experience', 'concept'].includes(params.get('status')) ? params.get('status') : 'all';
  const requestedService = params.get('service');
  if ([...serviceSelect.options].some(o => o.value === requestedService)) serviceSelect.value = requestedService;
  const cards = [...document.querySelectorAll('#project-list .project-card')];
  const resetButton = document.querySelector('#reset-filters');
  function filter(updateURL = true) {
    let visible = 0;
    cards.forEach(card => { const matches = (status === 'all' || card.dataset.status === status) && (serviceSelect.value === 'all' || card.dataset.services.split(' ').includes(serviceSelect.value)); card.hidden = !matches; if (matches) visible++; });
    document.querySelector('#project-count').textContent = `Showing ${visible} ${visible === 1 ? 'project or example' : 'projects & examples'}`;
    document.querySelector('#project-empty').hidden = visible > 0;
    resetButton.hidden = status === 'all' && serviceSelect.value === 'all';
    document.querySelectorAll('[data-status-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.statusFilter === status)));
    if (updateURL) { const query = new URLSearchParams(); if (status !== 'all') query.set('status', status); if (serviceSelect.value !== 'all') query.set('service', serviceSelect.value); history.replaceState(null, '', location.pathname + (query.size ? `?${query}` : '')); }
  }
  document.querySelectorAll('[data-status-filter]').forEach(button => button.addEventListener('click', () => { status = button.dataset.statusFilter; filter(); }));
  serviceSelect.addEventListener('change', () => filter());
  const reset = () => { status = 'all'; serviceSelect.value = 'all'; filter(); };
  resetButton.addEventListener('click', reset); document.querySelector('[data-reset]').addEventListener('click', reset);
  filter(false);
}

const enquiryForm = document.querySelector('#enquiry-form');
if (enquiryForm) {
  const params = new URLSearchParams(location.search);
  const select = document.querySelector('#enquiry-service');
  const requested = params.get('service');
  if ([...select.options].some(o => o.value === requested)) select.value = requested;
  const project = params.get('project');
  if (project) enquiryForm.elements.message.value = `I would like to discuss the ${project.slice(0,150)} project.\n\n`;
  let draft = '';
  enquiryForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!enquiryForm.reportValidity()) return;
    const data = new FormData(enquiryForm);
    const service = select.options[select.selectedIndex].text;
    const subject = `BOW enquiry — ${service}${data.get('company') ? ` — ${data.get('company')}` : ''}`;
    draft = `Name: ${data.get('firstName')} ${data.get('lastName')}\nEmail: ${data.get('email')}\nCompany: ${data.get('company') || 'Not provided'}\nService: ${service}\n\n${data.get('message')}`;
    const recipient = select.value === 'structures' ? 'hassankassem@bowprojects.com.au' : 'info@bowprojects.com.au';
    const result = document.querySelector('#enquiry-result');
    result.querySelector('a').href = `mailto:${recipient}`; result.querySelector('a').textContent = recipient;
    result.hidden = false;
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
  });
  document.querySelector('#copy-enquiry').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(draft); document.querySelector('#copy-status').textContent = 'Copied.'; }
    catch { const area = document.createElement('textarea'); area.value = draft; area.readOnly = true; area.className = 'copy-fallback'; document.querySelector('#enquiry-result').append(area); area.focus(); area.select(); document.querySelector('#copy-status').textContent = 'Select and copy the enquiry below.'; }
  });
}

const heroVideo = document.querySelector('.hero-video');
const videoToggle = document.querySelector('.hero-video-toggle');
if (heroVideo && videoToggle) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateVideoToggle = () => {
    const paused = heroVideo.paused;
    videoToggle.setAttribute('aria-label', paused ? 'Play background animation' : 'Pause background animation');
    videoToggle.innerHTML = paused
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14" stroke="currentColor" stroke-width="2"/></svg>';
  };
  heroVideo.muted = true;
  if (reducedMotion.matches) { heroVideo.autoplay = false; heroVideo.pause(); }
  else { heroVideo.play().catch(updateVideoToggle); }
  videoToggle.hidden = false;
  heroVideo.addEventListener('play', updateVideoToggle);
  heroVideo.addEventListener('pause', updateVideoToggle);
  heroVideo.addEventListener('error', () => { videoToggle.hidden = true; });
  videoToggle.addEventListener('click', () => {
    if (heroVideo.paused) heroVideo.play().catch(updateVideoToggle);
    else heroVideo.pause();
  });
  reducedMotion.addEventListener('change', e => { if (e.matches) heroVideo.pause(); });
  updateVideoToggle();
}


document.addEventListener('keydown', event => {
  const editing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' || event.key === '/' && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    if (menuDialog.open) menuDialog.close();
    openDialog('#search-dialog'); searchSite();
  }
});
search?.addEventListener('keydown', event => {
  const links = [...results.querySelectorAll('a')];
  if (event.key === 'ArrowDown' && links.length) { event.preventDefault(); links[0].focus(); }
  if (event.key === 'Enter' && links.length) { event.preventDefault(); links[0].click(); }
});
results?.addEventListener('keydown', event => {
  const links = [...results.querySelectorAll('a')];
  const index = links.indexOf(document.activeElement);
  if (index < 0) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); links[Math.min(index + 1, links.length - 1)]?.focus(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); if (index === 0) search.focus(); else links[index - 1].focus(); }
});
