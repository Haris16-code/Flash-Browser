let tabCount = 0;
let currentTabId = null;

function normalizeUrl(inputUrl) {
  inputUrl = inputUrl.trim();
  if (!inputUrl) return null;
  if (/^(https?:\/\/)/i.test(inputUrl)) return inputUrl;
  if (/^www\./i.test(inputUrl)) return 'https://' + inputUrl;
  if (/^[\w-]+\.[a-z]{2,}$/i.test(inputUrl)) return 'https://www.' + inputUrl;
  return 'https://' + inputUrl;
}

function createTab(url = '') {
  tabCount++;
  const tabId = `tab${tabCount}`;

  const tabButton = document.createElement('button');
  tabButton.className = 'tab-btn';
  tabButton.id = `${tabId}-btn`;
  tabButton.textContent = `Tab ${tabCount}`;
  tabButton.onclick = () => activateTab(tabId);
  document.getElementById('tabs').appendChild(tabButton);

  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';
  tabContent.id = tabId;

  const toolbar = document.createElement('div');
  toolbar.className = 'tab-toolbar';

  const input = document.createElement('input');
  input.placeholder = 'Enter URL, e.g. google.com';
  input.onkeydown = e => {
    if (e.key === 'Enter') loadInTab(tabId, input.value);
  };

  const goBtn = document.createElement('button');
  goBtn.textContent = 'Go';
  goBtn.onclick = () => loadInTab(tabId, input.value);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '❌';
  closeBtn.onclick = () => closeTab(tabId);

  toolbar.append(input, goBtn, closeBtn);

  const iframe = document.createElement('iframe');
  iframe.className = 'tab-iframe';

  tabContent.append(toolbar, iframe);
  document.getElementById('tabContainer').appendChild(tabContent);

  activateTab(tabId);

  if (url) {
    input.value = url;
    loadInTab(tabId, url);
  }
}

function activateTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  const button = document.getElementById(`${tabId}-btn`);
  const content = document.getElementById(tabId);
  if (button && content) {
    button.classList.add('active');
    content.classList.add('active');
    currentTabId = tabId;
  }
}

function closeTab(tabId) {
  const btn = document.getElementById(`${tabId}-btn`);
  const tab = document.getElementById(tabId);
  if (btn) btn.remove();
  if (tab) tab.remove();
  if (currentTabId === tabId) {
    const remaining = document.querySelectorAll('.tab-btn');
    if (remaining.length > 0) remaining[0].click();
    else currentTabId = null;
  }
}

async function loadInTab(tabId, urlInput) {
  const normalized = normalizeUrl(urlInput);
  if (!normalized) return;

  const iframe = document.querySelector(`#${tabId} iframe`);
  const input = document.querySelector(`#${tabId} input`);

  input.disabled = true;
  iframe.srcdoc = `<p style="padding:20px;">Loading <span style="font-size:20px;">⏳</span>...</p>`;

  try {
    const response = await puter.net.fetch(normalized);
    const body = await response.text();
    const finalHTML = injectLinkHandler(body, normalized);
    iframe.srcdoc = finalHTML;
    input.value = normalized;
  } catch (err) {
    iframe.srcdoc = `<p style="padding:20px;color:red;">Error loading page: ${err.message}</p>`;
  } finally {
    input.disabled = false;
  }
}

function injectLinkHandler(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let base = doc.querySelector('base');
  if (!base) {
    base = document.createElement('base');
    base.href = baseUrl;
    doc.head.prepend(base);
  } else {
    base.href = baseUrl;
  }

  const script = document.createElement('script');
  script.textContent = `
    document.addEventListener('click', function(event) {
      const link = event.target.closest('a');
      if (link && link.href) {
        event.preventDefault();
        parent.postMessage({ type: 'navigate', url: link.href, tabId: '${currentTabId}' }, '*');
      }
    }, true);
  `;
  doc.head.appendChild(script);

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

window.addEventListener('message', e => {
  if (e.data && e.data.type === 'navigate') {
    const tabId = e.data.tabId;
    const url = normalizeUrl(e.data.url);
    if (tabId && url) {
      loadInTab(tabId, url);
    }
  }
});

document.getElementById('newTabBtn').onclick = () => createTab();

createTab(); // Open first tab by default
