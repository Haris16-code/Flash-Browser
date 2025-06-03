// --- Global Constants and Variables ---
    const THEME_KEY = 'flashBrowserTheme';
    const BOOKMARKS_KEY = 'flashBrowserBookmarks';
    const HISTORY_KEY = 'flashBrowserGlobalHistory';
    const SEARCH_ENGINE_KEY = 'flashBrowserSearchEngine';
    const HOMEPAGE_KEY = 'flashBrowserHomepage';

    const DEFAULT_NEW_TAB_URL = "https://www.bing.com"; // Fallback if no homepage is set by user
    const DEFAULT_SEARCH_ENGINE_URL = 'https://www.bing.com/search?q=';

    let currentTheme = 'light';
    let currentSearchEngineUrl = DEFAULT_SEARCH_ENGINE_URL;
    let defaultHomepageUrl = DEFAULT_NEW_TAB_URL; // Will be updated from localStorage

    let tabCount = 0;
    let currentTabId = null;
    const historyByTab = {};
    let bookmarks = [];
    let globalHistory = [];

    // --- DOM Elements ---
    let settingsModalEl, openSettingsBtnEl, closeSettingsModalBtnEl, themeSelectorEl, searchEngineSelectorEl;
    let homepageModalEl, openHomepageModalBtnEl, closeHomepageModalBtnEl, homepageUrlInputEl, saveHomepageBtnEl, currentHomepageDisplayEl;
    let bookmarksBtnEl, bookmarksModalEl, closeBookmarksModalBtnEl, bookmarksListEl;
    let historyBtnEl, historyModalEl, closeHistoryModalBtnEl, historyListContainerEl, clearAllHistoryBtnEl;

    // --- Theme Management ---
    function applyTheme(theme) {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(theme + '-theme');
      if (themeSelectorEl) themeSelectorEl.value = theme;
      currentTheme = theme;
    }
    function saveTheme(theme) {
      try { localStorage.setItem(THEME_KEY, theme); }
      catch (e) { console.error("Could not save theme to localStorage:", e); }
    }
    function loadTheme() {
      let savedTheme = 'light';
      try { savedTheme = localStorage.getItem(THEME_KEY) || 'light'; }
      catch (e) { console.error("Could not load theme from localStorage:", e); }
      applyTheme(savedTheme);
    }

    // --- Search Engine Setting ---
    function loadSearchEngineSetting() {
        try {
            currentSearchEngineUrl = localStorage.getItem(SEARCH_ENGINE_KEY) || DEFAULT_SEARCH_ENGINE_URL;
        } catch (e) {
            console.error("Could not load search engine setting from localStorage:", e);
            currentSearchEngineUrl = DEFAULT_SEARCH_ENGINE_URL;
        }
        if (searchEngineSelectorEl) {
            searchEngineSelectorEl.value = currentSearchEngineUrl;
        }
    }
    function saveSearchEngineSetting(url) {
        try {
            localStorage.setItem(SEARCH_ENGINE_KEY, url);
            currentSearchEngineUrl = url;
        } catch (e) {
            console.error("Could not save search engine setting to localStorage:", e);
        }
    }

    // --- Homepage Setting ---
    function updateCurrentHomepageDisplay() {
        if (currentHomepageDisplayEl) {
            let displayVal = defaultHomepageUrl;
            if (defaultHomepageUrl === "about:blank") {
                displayVal = "New Tab Page (Default)";
            }
            currentHomepageDisplayEl.textContent = displayVal.length > 30 ? displayVal.substring(0, 27) + "..." : displayVal;
            currentHomepageDisplayEl.title = defaultHomepageUrl; // Full URL on hover
        }
    }
    function loadHomepageSetting() {
        try {
            const savedHomepage = localStorage.getItem(HOMEPAGE_KEY);
            if (savedHomepage !== null) { // If there's a saved value (even "about:blank" or empty string which we treat as about:blank)
                defaultHomepageUrl = savedHomepage;
            } else { // No setting found, use the system default
                defaultHomepageUrl = DEFAULT_NEW_TAB_URL;
            }
        } catch (e) {
            console.error("Could not load homepage setting from localStorage:", e);
            defaultHomepageUrl = DEFAULT_NEW_TAB_URL; // Fallback
        }
        updateCurrentHomepageDisplay();
    }
    function saveHomepageSetting() {
        let newUrl = homepageUrlInputEl.value.trim();
        let finalUrlToSave;

        if (newUrl === '') {
            finalUrlToSave = "about:blank"; // User wants the placeholder new tab page
        } else if (/^(https?:\/\/)/i.test(newUrl)) {
            finalUrlToSave = newUrl; // Already a full URL
        } else if (newUrl.startsWith('about:') || newUrl.startsWith('data:') || newUrl.startsWith('blob:') || newUrl.startsWith('file:')) {
            finalUrlToSave = newUrl; // Special protocol
        } else if (newUrl.includes('.') && !newUrl.includes(' ') && !newUrl.startsWith('/')) { // Looks like a domain (e.g., example.com)
            finalUrlToSave = 'https://' + newUrl;
        } else {
            alert("Invalid Homepage URL. Please enter a full URL (e.g., https://example.com), a special page (e.g. about:blank), or leave blank for the default new tab page.");
            homepageUrlInputEl.focus();
            return; // Don't save, don't close modal
        }

        try {
            localStorage.setItem(HOMEPAGE_KEY, finalUrlToSave);
            defaultHomepageUrl = finalUrlToSave;
        } catch (e) {
            console.error("Could not save homepage setting to localStorage:", e);
            alert("Error saving homepage setting.");
        }
        
        updateCurrentHomepageDisplay();
        closeHomepageModal();
    }
    function showHomepageModal() {
        if(homepageModalEl) {
            homepageUrlInputEl.value = defaultHomepageUrl === "about:blank" ? "" : defaultHomepageUrl; // Show empty if it's about:blank
            homepageModalEl.classList.add('active');
            homepageUrlInputEl.focus();
            homepageUrlInputEl.select();
        }
    }
    function closeHomepageModal() {
        if(homepageModalEl) homepageModalEl.classList.remove('active');
    }


    // --- Bookmark Management ---
    function loadBookmarks() {
        try {
            const storedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
            bookmarks = storedBookmarks ? JSON.parse(storedBookmarks) : [];
        } catch (e) { console.error("Error loading bookmarks:", e); bookmarks = []; }
    }
    function saveBookmarks() {
        try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks)); }
        catch (e) { console.error("Error saving bookmarks:", e); }
    }
    function isBookmarked(url) {
        const normalized = normalizeUrlForBookmarkCheck(url); 
        return bookmarks.some(bm => bm.url === normalized);
    }
    function renderBookmarksList() {
        if (!bookmarksListEl) return;
        bookmarksListEl.innerHTML = '';
        if (bookmarks.length === 0) {
            bookmarksListEl.innerHTML = '<li class="no-bookmarks">No bookmarks yet. Click the ☆ star in a tab to add one.</li>';
            return;
        }
        bookmarks.forEach(bookmark => {
            const listItem = document.createElement('li');
            const textContainer = document.createElement('div');
            textContainer.className = 'bookmark-title-url-container';
            textContainer.onclick = () => {
                if (currentTabId) loadInTab(currentTabId, bookmark.url);
                else createTab(bookmark.url);
                closeBookmarksModal();
            };
            const titleSpan = document.createElement('span');
            titleSpan.className = 'bookmark-title';
            titleSpan.textContent = bookmark.title;
            const urlSpan = document.createElement('span');
            urlSpan.className = 'bookmark-url';
            urlSpan.textContent = bookmark.url;
            textContainer.appendChild(titleSpan);
            textContainer.appendChild(urlSpan);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'bookmark-delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete bookmark';
            deleteBtn.onclick = (e) => { e.stopPropagation(); removeBookmarkByURL(bookmark.url); };
            listItem.appendChild(textContainer);
            listItem.appendChild(deleteBtn);
            bookmarksListEl.appendChild(listItem);
        });
    }
    function updateBookmarkButtonState(tabId, url) {
        const tabContent = document.getElementById(tabId);
        if (!tabContent || !url) return; 
        const bookmarkBtn = tabContent.querySelector('.bookmark-button');
        if (bookmarkBtn) {
            const normalizedUrlForCheck = normalizeUrlForBookmarkCheck(url);
            if (isBookmarked(normalizedUrlForCheck)) {
                bookmarkBtn.textContent = '★'; bookmarkBtn.title = 'Remove bookmark';
            } else {
                bookmarkBtn.textContent = '☆'; bookmarkBtn.title = 'Bookmark this page';
            }
        }
    }
    function toggleBookmark(tabId) {
        const tabContent = document.getElementById(tabId);
        if (!tabContent) return;
        const urlInput = tabContent.querySelector('input[type="text"]');
        const tabButton = document.getElementById(`${tabId}-btn`);
        const titleSpanInTab = tabButton ? tabButton.querySelector('.tab-title') : null;
        if (!urlInput || !titleSpanInTab) return;

        const pageUrl = normalizeUrlForBookmarkCheck(urlInput.value);
        const pageTitle = titleSpanInTab.title || titleSpanInTab.textContent || pageUrl;

        if (!pageUrl || pageUrl.startsWith("about:blank") || pageUrl.includes("New Tab</h1>") || !pageTitle || pageTitle === "Loading..." || pageTitle === "Error" || pageTitle === "New Tab") {
            alert("Cannot bookmark this page."); return;
        }
        if (isBookmarked(pageUrl)) bookmarks = bookmarks.filter(bm => bm.url !== pageUrl);
        else bookmarks.push({ title: pageTitle, url: pageUrl });
        saveBookmarks();
        renderBookmarksList();
        updateBookmarkButtonState(tabId, pageUrl);
    }
    function removeBookmarkByURL(urlToRemove) {
        const normalizedUrlToRemove = normalizeUrlForBookmarkCheck(urlToRemove);
        bookmarks = bookmarks.filter(bm => bm.url !== normalizedUrlToRemove);
        saveBookmarks();
        renderBookmarksList();
        if (currentTabId) {
            const activeTabContent = document.getElementById(currentTabId);
            if (activeTabContent) {
                const activeUrlInput = activeTabContent.querySelector('input[type="text"]');
                if (activeUrlInput && normalizeUrlForBookmarkCheck(activeUrlInput.value) === normalizedUrlToRemove) {
                    updateBookmarkButtonState(currentTabId, normalizedUrlToRemove);
                }
            }
        }
    }
    function showBookmarksModal() {
        if (bookmarksModalEl) {
            renderBookmarksList();
            bookmarksModalEl.classList.add('active');
        }
    }
    function closeBookmarksModal() {
        if (bookmarksModalEl) bookmarksModalEl.classList.remove('active');
    }

    // --- Global History Management ---
    function loadGlobalHistory() {
        try {
            const storedHistory = localStorage.getItem(HISTORY_KEY);
            globalHistory = storedHistory ? JSON.parse(storedHistory) : [];
            globalHistory.sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) { console.error("Error loading global history:", e); globalHistory = []; }
    }
    function saveGlobalHistory() {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(globalHistory)); }
        catch (e) { console.error("Error saving global history:", e); }
    }
    function logToGlobalHistory(url, title, timestamp) {
        if (!url || url.startsWith("about:blank") || url.includes("New Tab</h1>") || !title || title === "Loading..." || title === "Error" || title === "New Tab") {
            return;
        }
        if (globalHistory.length > 0 && globalHistory[0].url === url && globalHistory[0].title === title && (timestamp - globalHistory[0].timestamp < 5000) ) {
            globalHistory[0].timestamp = timestamp; 
        } else {
            globalHistory.unshift({ url, title, timestamp });
        }
        saveGlobalHistory();
    }
    function renderGlobalHistory() {
        if (!historyListContainerEl) return;
        historyListContainerEl.innerHTML = '';
        if (globalHistory.length === 0) {
            historyListContainerEl.innerHTML = '<div class="no-history">Your browsing history is empty.</div>';
            return;
        }
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
        const sevenDaysAgoStart = todayStart - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoStart = todayStart - (30 * 24 * 60 * 60 * 1000);

        const groups = {
            today: { title: "Today", items: [] }, yesterday: { title: "Yesterday", items: [] },
            previous7Days: { title: "Previous 7 Days", items: [] }, previous30Days: { title: "Previous 30 Days", items: [] },
            older: { title: "Older", items: [] }
        };
        globalHistory.forEach(item => {
            if (item.timestamp >= todayStart) groups.today.items.push(item);
            else if (item.timestamp >= yesterdayStart) groups.yesterday.items.push(item);
            else if (item.timestamp >= sevenDaysAgoStart) groups.previous7Days.items.push(item);
            else if (item.timestamp >= thirtyDaysAgoStart) groups.previous30Days.items.push(item);
            else groups.older.items.push(item);
        });
        for (const groupKey in groups) {
            const group = groups[groupKey];
            if (group.items.length > 0) {
                const groupDiv = document.createElement('div'); groupDiv.className = 'history-group';
                const groupTitle = document.createElement('h3'); groupTitle.textContent = group.title;
                groupDiv.appendChild(groupTitle); const itemList = document.createElement('ul');
                group.items.forEach(item => {
                    const listItem = document.createElement('li');
                    const detailsDiv = document.createElement('div'); detailsDiv.className = 'history-item-details';
                    detailsDiv.onclick = () => {
                        if (currentTabId) loadInTab(currentTabId, item.url);
                        else createTab(item.url);
                        closeHistoryModal();
                    };
                    const titleSpan = document.createElement('span'); titleSpan.className = 'history-item-title'; titleSpan.textContent = item.title;
                    const urlSpan = document.createElement('span'); urlSpan.className = 'history-item-url'; urlSpan.textContent = item.url;
                    detailsDiv.appendChild(titleSpan); detailsDiv.appendChild(urlSpan);
                    const timeSpan = document.createElement('span'); timeSpan.className = 'history-item-time';
                    const itemDate = new Date(item.timestamp);
                    timeSpan.textContent = itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const deleteBtn = document.createElement('button'); deleteBtn.className = 'history-item-delete-btn';
                    deleteBtn.innerHTML = '&times;'; deleteBtn.title = 'Remove from history';
                    deleteBtn.onclick = (e) => { e.stopPropagation(); deleteHistoryItem(item.timestamp); };
                    listItem.appendChild(timeSpan); listItem.appendChild(detailsDiv); listItem.appendChild(deleteBtn);
                    itemList.appendChild(listItem);
                });
                groupDiv.appendChild(itemList); historyListContainerEl.appendChild(groupDiv);
            }
        }
    }
    function deleteHistoryItem(timestamp) {
        globalHistory = globalHistory.filter(item => item.timestamp !== timestamp);
        saveGlobalHistory(); renderGlobalHistory();
    }
    function clearAllGlobalHistory() {
        if (confirm("Are you sure you want to clear all browsing history? This cannot be undone.")) {
            globalHistory = []; saveGlobalHistory(); renderGlobalHistory();
        }
    }
    function showHistoryModal() {
        if (historyModalEl) { renderGlobalHistory(); historyModalEl.classList.add('active'); }
    }
    function closeHistoryModal() {
        if (historyModalEl) historyModalEl.classList.remove('active');
    }

    // --- URL Normalization ---
    function normalizeUrl(inputUrl) {
      inputUrl = String(inputUrl || '').trim();
      if (!inputUrl) return null;
      if (/^(data:|blob:|about:|file:)/i.test(inputUrl)) return inputUrl; 
      if (/^(https?:\/\/)/i.test(inputUrl)) return inputUrl;
      if (/^www\./i.test(inputUrl) || inputUrl.includes('.')) { 
        const domainPattern = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
        const match = inputUrl.match(domainPattern);
        if (match && match[4] && match[4].includes('.')) { 
            return 'https://' + inputUrl;
        }
      }
      return currentSearchEngineUrl + encodeURIComponent(inputUrl);
    }

    function normalizeUrlForBookmarkCheck(inputUrl) {
        inputUrl = String(inputUrl || '').trim();
        if (!inputUrl) return null;
        if (/^(https?:\/\/)/i.test(inputUrl)) return inputUrl;
        if (/^www\./i.test(inputUrl) || inputUrl.includes('.')) {
            const domainPattern = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
            const match = inputUrl.match(domainPattern);
            if (match && match[4] && match[4].includes('.')) {
                return 'https://' + inputUrl;
            }
        }
        return inputUrl;
    }


    // --- Tab Management ---
    function createTab(initialUrlOverride = '') {
      tabCount++;
      const tabId = `tab${tabCount}`;
      historyByTab[tabId] = { urls: [], currentIndex: -1 };

      const tabButton = document.createElement('button');
      tabButton.className = 'tab-btn';
      tabButton.id = `${tabId}-btn`;
      tabButton.onclick = (event) => {
        if (event.target.closest('.tab-close-button') === null) activateTab(tabId);
      };
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = `New Tab`; // Placeholder, will be updated
      tabButton.appendChild(titleSpan);
      const closeButton = document.createElement('button');
      closeButton.className = 'tab-close-button';
      closeButton.innerHTML = '&times;';
      closeButton.title = 'Close Tab';
      closeButton.onclick = (e) => { e.stopPropagation(); closeTab(tabId); };
      tabButton.appendChild(closeButton);
      document.getElementById('tabs').appendChild(tabButton);

      const tabContent = document.createElement('div');
      tabContent.className = 'tab-content';
      tabContent.id = tabId;
      const toolbar = document.createElement('div');
      toolbar.className = 'tab-toolbar';
      const backBtn = document.createElement('button');
      backBtn.className = 'nav-button'; backBtn.innerHTML = '←'; backBtn.title = 'Back'; backBtn.disabled = true;
      backBtn.onclick = () => navigateHistory(tabId, 'back');
      const forwardBtn = document.createElement('button');
      forwardBtn.className = 'nav-button'; forwardBtn.innerHTML = '→'; forwardBtn.title = 'Forward'; forwardBtn.disabled = true;
      forwardBtn.onclick = () => navigateHistory(tabId, 'forward');
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'nav-button'; refreshBtn.innerHTML = '↻'; refreshBtn.title = 'Refresh';
      refreshBtn.onclick = () => {
        const currentIframe = document.querySelector(`#${tabId} iframe`);
        const currentUrlInInput = document.querySelector(`#${tabId} input[type="text"]`).value;
        if (currentUrlInInput && currentUrlInInput !== "about:blank" && !(currentIframe && currentIframe.srcdoc && currentIframe.srcdoc.includes("New Tab</h1>"))) {
             loadInTab(tabId, currentUrlInInput, false); 
        } else {
            if (currentIframe) {
                const tabHistory = historyByTab[tabId];
                const initialTabUrl = tabHistory && tabHistory.urls.length > 0 ? tabHistory.urls[tabHistory.currentIndex] : defaultHomepageUrl;
                if (initialTabUrl && initialTabUrl !== "about:blank") {
                     loadInTab(tabId, initialTabUrl, false);
                } else {
                     setNewTabPlaceholderContent(currentIframe, titleSpan); 
                }
            }
        }
      };
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'bookmark-button';
      bookmarkBtn.innerHTML = '☆';
      bookmarkBtn.title = 'Bookmark this page';
      bookmarkBtn.onclick = () => toggleBookmark(tabId);
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = 'Enter URL or search';
      urlInput.onkeydown = e => { if (e.key === 'Enter') loadInTab(tabId, urlInput.value); };
      const goBtn = document.createElement('button');
      goBtn.className = 'go-button'; goBtn.textContent = 'Go';
      goBtn.onclick = () => loadInTab(tabId, urlInput.value);
      toolbar.append(backBtn, forwardBtn, refreshBtn, bookmarkBtn, urlInput, goBtn);

      const iframe = document.createElement('iframe');
      iframe.className = 'tab-iframe';
      iframe.sandbox = "allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation";
      tabContent.append(toolbar, iframe);
      document.getElementById('tabContainer').appendChild(tabContent);

      activateTab(tabId);

      const urlForNewTab = (initialUrlOverride && initialUrlOverride.trim() !== '') 
                         ? initialUrlOverride 
                         : defaultHomepageUrl;

      if (urlForNewTab && urlForNewTab !== "about:blank") {
        const normalizedUrlToLoad = normalizeUrl(urlForNewTab);
        urlInput.value = normalizedUrlToLoad;
        loadInTab(tabId, normalizedUrlToLoad);
      } else {
        setNewTabPlaceholderContent(iframe, titleSpan);
        updateBookmarkButtonState(tabId, ''); 
      }
      updateNavButtons(tabId);
    }
    function setNewTabPlaceholderContent(iframeElement, titleSpanElement) {
        if (iframeElement) {
            iframeElement.srcdoc = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:80%; font-family: Arial, sans-serif; color: ${currentTheme === 'dark' ? '#ccc' : '#555'};"><h1 style="font-weight:lighter;font-size:2em;">New Tab</h1></div>`;
        }
        if (titleSpanElement) {
            titleSpanElement.textContent = 'New Tab';
            titleSpanElement.title = 'New Tab';
        }
        const tabContent = iframeElement.closest('.tab-content');
        if (tabContent) {
            const urlInput = tabContent.querySelector('input[type="text"]');
            if (urlInput) urlInput.value = ''; // Clear address bar for placeholder
        }
    }
    function updateNavButtons(tabId) {
        const tabHistory = historyByTab[tabId];
        const tabContentElement = document.getElementById(tabId);
        if (!tabContentElement) return;
        const backBtn = tabContentElement.querySelector('.nav-button[title="Back"]');
        const forwardBtn = tabContentElement.querySelector('.nav-button[title="Forward"]');
        if (tabHistory && backBtn && forwardBtn) {
            backBtn.disabled = tabHistory.currentIndex <= 0;
            forwardBtn.disabled = tabHistory.currentIndex >= tabHistory.urls.length - 1;
        } else if (backBtn && forwardBtn) {
            backBtn.disabled = true; forwardBtn.disabled = true;
        }
    }
    function navigateHistory(tabId, direction) {
        const tabHistory = historyByTab[tabId];
        if (!tabHistory) return;
        let newIndex = tabHistory.currentIndex;
        if (direction === 'back' && tabHistory.currentIndex > 0) newIndex--;
        else if (direction === 'forward' && tabHistory.currentIndex < tabHistory.urls.length - 1) newIndex++;
        if (newIndex !== tabHistory.currentIndex && tabHistory.urls[newIndex]) {
            tabHistory.currentIndex = newIndex;
            const urlToLoad = tabHistory.urls[newIndex];
            loadInTab(tabId, urlToLoad, false); 
            document.querySelector(`#${tabId} input[type="text"]`).value = urlToLoad;
        }
        updateNavButtons(tabId);
    }
    function activateTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      const button = document.getElementById(`${tabId}-btn`);
      const content = document.getElementById(tabId);
      if (button && content) {
        button.classList.add('active'); content.classList.add('active'); currentTabId = tabId;
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        const urlInput = content.querySelector('input[type="text"]');
        if (urlInput) {
            const iframe = content.querySelector('iframe.tab-iframe');
            const isNewTabPlaceholder = iframe && iframe.srcdoc && iframe.srcdoc.includes("<h1 style=\"font-weight:lighter;font-size:2em;\">New Tab</h1>");
            if (isNewTabPlaceholder || !urlInput.value) setTimeout(() => urlInput.focus(), 50);
            updateBookmarkButtonState(tabId, urlInput.value || '');
        }
      }
    }
    function closeTab(tabId) {
        const tabButtonToClose = document.getElementById(`${tabId}-btn`);
        const tabContentToClose = document.getElementById(tabId);
        if (!tabButtonToClose || !tabContentToClose) return;
        const parentTabs = document.getElementById('tabs');
        const allTabButtons = Array.from(parentTabs.children);
        const closedTabIndex = allTabButtons.indexOf(tabButtonToClose);
        tabButtonToClose.remove(); tabContentToClose.remove(); delete historyByTab[tabId];
        if (currentTabId === tabId) currentTabId = null;
        const remainingButtons = Array.from(parentTabs.children);
        if (tabButtonToClose.classList.contains('active') && remainingButtons.length > 0) {
            let newIndexToActivate = closedTabIndex;
            if (newIndexToActivate >= remainingButtons.length) newIndexToActivate = remainingButtons.length - 1;
            if (newIndexToActivate < 0) newIndexToActivate = 0; 
            if (remainingButtons[newIndexToActivate]) {
                 activateTab(remainingButtons[newIndexToActivate].id.replace('-btn', ''));
            } else if (remainingButtons.length > 0) { 
                 activateTab(remainingButtons[0].id.replace('-btn', ''));
            }
        } else if (remainingButtons.length === 0) {
            currentTabId = null; createTab(); // Create tab using default homepage
        }
    }
    async function loadInTab(tabId, urlInput, addToHistoryByTab = true) {
      const normalizedUrl = normalizeUrl(urlInput);
      if (!normalizedUrl) {
          console.warn("Normalization resulted in null URL for input:", urlInput);
          return;
      }
      const tabContentElement = document.getElementById(tabId);
      if (!tabContentElement) return;
      const iframe = tabContentElement.querySelector('iframe.tab-iframe');
      const inputField = tabContentElement.querySelector('input[type="text"]');
      const titleSpanOnTabButton = document.querySelector(`#${tabId}-btn .tab-title`);
      if (!iframe || !inputField || !titleSpanOnTabButton) return;

      inputField.disabled = true; inputField.value = normalizedUrl;
      titleSpanOnTabButton.textContent = 'Loading...'; titleSpanOnTabButton.title = 'Loading...';
      iframe.srcdoc = '';
      iframe.srcdoc = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:80%; padding:20px; font-family: Arial, sans-serif; text-align: center; color: ${currentTheme === 'dark' ? '#ccc' : '#333'};">Loading <span style="font-size:1.5em;">⏳</span><br><small style="word-break:break-all;">${normalizedUrl}</small></div>`;
      updateBookmarkButtonState(tabId, normalizedUrl);

      if (addToHistoryByTab) {
        const tabHistory = historyByTab[tabId];
        if (tabHistory) {
            if (tabHistory.currentIndex < tabHistory.urls.length - 1) {
                tabHistory.urls = tabHistory.urls.slice(0, tabHistory.currentIndex + 1);
            }
            if (tabHistory.urls.length === 0 || tabHistory.urls[tabHistory.urls.length -1] !== normalizedUrl) {
                tabHistory.urls.push(normalizedUrl);
            }
            tabHistory.currentIndex = tabHistory.urls.length - 1;
        }
      }
      updateNavButtons(tabId);

      try {
        if (typeof puter === 'undefined' || !puter.net || !puter.net.fetch) {
            throw new Error("Puter.js library not available or not loaded correctly.");
        }
        const response = await puter.net.fetch(normalizedUrl);
        const bodyText = await response.text();
        const finalHTML = injectLinkHandler(bodyText, normalizedUrl, tabId);
        iframe.srcdoc = finalHTML;
        
        setTimeout(() => {
            let pageTitle = "Page";
            try {
                const tempDoc = new DOMParser().parseFromString(finalHTML, 'text/html');
                const titleTag = tempDoc.querySelector('title');
                if (titleTag && titleTag.textContent.trim()) {
                    pageTitle = titleTag.textContent.trim();
                } else {
                    try {
                        const urlObj = new URL(normalizedUrl);
                        pageTitle = urlObj.hostname.replace(/^www\./, '');
                        if (!pageTitle || pageTitle.toLowerCase() === "search" || pageTitle.length === 0) {
                             if (normalizedUrl.includes('google.com/search') || normalizedUrl.includes('bing.com/search') || normalizedUrl.includes('duckduckgo.com/')) {
                                const queryParams = urlObj.searchParams; const q = queryParams.get('q');
                                if (q) pageTitle = `Search: ${q.substring(0,15)}${q.length > 15 ? '...' : ''}`;
                                else pageTitle = urlObj.hostname.replace(/^www\./, '') || "Untitled Page";
                            } else pageTitle = urlObj.hostname.replace(/^www\./, '') || "Untitled Page";
                        }
                    } catch (urlError) { 
                        pageTitle = normalizedUrl === "about:blank" ? "New Tab" : "Untitled Page"; // Changed "Blank Page" to "New Tab"
                    }
                }
            } catch (e) {
                console.warn("Error generating page title:", e);
                try { pageTitle = new URL(normalizedUrl).hostname.replace(/^www\./, '') || "Page"; }
                catch { pageTitle = "Page"; }
            }
            titleSpanOnTabButton.textContent = pageTitle.length > 20 ? pageTitle.substring(0, 18) + '...' : pageTitle;
            titleSpanOnTabButton.title = pageTitle; 
            logToGlobalHistory(normalizedUrl, pageTitle, Date.now());
        }, 150); 
      } catch (err) {
        iframe.srcdoc = `<div style="padding:20px;color:red; font-family: Arial, sans-serif; text-align: center;">Error loading page: ${err.message}<br><small style="word-break:break-all;">${normalizedUrl}</small></div>`;
        titleSpanOnTabButton.textContent = 'Error'; titleSpanOnTabButton.title = 'Error';
        console.error(`Puter.net.fetch error for "${normalizedUrl}":`, err);
      } finally {
        inputField.disabled = false;
        updateBookmarkButtonState(tabId, inputField.value);
      }
    }
    function injectLinkHandler(html, baseUrl, tabIdForInjection) {
      const parser = new DOMParser(); const doc = parser.parseFromString(html, 'text/html');
      let base = doc.querySelector('base');
      if (!base) {
        base = doc.createElement('base');
        if (doc.head) doc.head.prepend(base);
        else { const headEl = doc.createElement('head'); doc.documentElement.prepend(headEl); headEl.prepend(base); }
      }
      base.href = baseUrl; 
      const script = doc.createElement('script');
      script.textContent = `
        document.addEventListener('click', function(event) {
          const link = event.target.closest('a');
          if (link && link.href && link.href.trim() !== '' && !link.href.toLowerCase().startsWith('javascript:')) {
            event.preventDefault(); let absoluteUrl;
            try { 
                absoluteUrl = new URL(link.getAttribute('href'), document.baseURI).href; 
            }
            catch (e) { console.warn('Invalid link URL:', link.getAttribute('href'), e); return; }

            if (link.target === '_blank' || event.metaKey || event.ctrlKey) {
              parent.postMessage({ type: 'newTabNavigate', url: absoluteUrl }, '*');
            } else {
              parent.postMessage({ type: 'navigate', url: absoluteUrl, tabId: '${tabIdForInjection}' }, '*');
            }
          }
        }, true); 
        document.addEventListener('submit', function(event) {
          const form = event.target.closest('form');
          if (form) {
            event.preventDefault(); const formData = new FormData(form); const params = new URLSearchParams(formData);
            let targetUrl;
            try {
                const formAction = form.getAttribute('action');
                targetUrl = new URL(formAction || '', document.baseURI);
            }
            catch (e) { console.warn('Invalid form action:', form.getAttribute('action'), e); return; }
            
            console.warn("Form submission method (e.g., POST) is converted to GET for this browser prototype.");
            targetUrl.search = params.toString(); 

            parent.postMessage({ type: 'navigate', url: targetUrl.href, tabId: '${tabIdForInjection}' }, '*');
          }
        }, true); 
      `;
      if(doc.body) doc.body.appendChild(script);
      else if (doc.head) doc.head.appendChild(script);
      else if (doc.documentElement) doc.documentElement.appendChild(script); 
      
      return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }

    // --- Event Listeners ---
    window.addEventListener('message', e => {
      if (e.origin === "null" && e.data && e.data.type) { 
        const { tabId, url } = e.data;
        if (e.data.type === 'navigate' && tabId && url && document.getElementById(tabId)) {
          activateTab(tabId);
          loadInTab(tabId, url); 
          const inputField = document.querySelector(`#${tabId} input[type="text"]`);
          if (inputField) inputField.value = normalizeUrl(url); 
        } else if (e.data.type === 'newTabNavigate' && url) {
          createTab(url); 
        }
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
        settingsModalEl = document.getElementById('settingsModal');
        openSettingsBtnEl = document.getElementById('openSettingsBtn');
        closeSettingsModalBtnEl = document.getElementById('closeSettingsModalBtn');
        themeSelectorEl = document.getElementById('themeSelector');
        searchEngineSelectorEl = document.getElementById('searchEngineSelector'); 

        homepageModalEl = document.getElementById('homepageModal');
        openHomepageModalBtnEl = document.getElementById('openHomepageModalBtn');
        closeHomepageModalBtnEl = document.getElementById('closeHomepageModalBtn');
        homepageUrlInputEl = document.getElementById('homepageUrlInput');
        saveHomepageBtnEl = document.getElementById('saveHomepageBtn');
        currentHomepageDisplayEl = document.getElementById('currentHomepageDisplay');

        bookmarksBtnEl = document.getElementById('bookmarksBtn');
        bookmarksModalEl = document.getElementById('bookmarksModal');
        closeBookmarksModalBtnEl = document.getElementById('closeBookmarksModalBtn');
        bookmarksListEl = document.getElementById('bookmarksList');
        historyBtnEl = document.getElementById('historyBtn');
        historyModalEl = document.getElementById('historyModal');
        closeHistoryModalBtnEl = document.getElementById('closeHistoryModalBtn');
        historyListContainerEl = document.getElementById('historyListContainer');
        clearAllHistoryBtnEl = document.getElementById('clearAllHistoryBtn');

        loadTheme(); 
        loadSearchEngineSetting(); 
        loadHomepageSetting(); // Load homepage preference
        loadBookmarks(); 
        loadGlobalHistory();

        if (openSettingsBtnEl) openSettingsBtnEl.onclick = () => { 
            if (themeSelectorEl) themeSelectorEl.value = currentTheme; 
            if (searchEngineSelectorEl) searchEngineSelectorEl.value = currentSearchEngineUrl; 
            updateCurrentHomepageDisplay(); // Make sure display is current when opening settings
            settingsModalEl.classList.add('active'); 
        };
        if (closeSettingsModalBtnEl) closeSettingsModalBtnEl.onclick = () => settingsModalEl.classList.remove('active');
        if (settingsModalEl) settingsModalEl.onclick = (e) => { if (e.target === settingsModalEl) settingsModalEl.classList.remove('active'); };
        
        // Homepage Modal Listeners
        if (openHomepageModalBtnEl) openHomepageModalBtnEl.onclick = showHomepageModal;
        if (closeHomepageModalBtnEl) closeHomepageModalBtnEl.onclick = closeHomepageModal;
        if (saveHomepageBtnEl) saveHomepageBtnEl.onclick = saveHomepageSetting;
        if (homepageModalEl) homepageModalEl.onclick = (e) => { if (e.target === homepageModalEl) closeHomepageModal(); };
        if (homepageUrlInputEl) homepageUrlInputEl.onkeydown = (e) => { if (e.key === 'Enter') saveHomepageSetting(); };


        if (bookmarksBtnEl) bookmarksBtnEl.onclick = showBookmarksModal;
        if (closeBookmarksModalBtnEl) closeBookmarksModalBtnEl.onclick = closeBookmarksModal;
        if (bookmarksModalEl) bookmarksModalEl.onclick = (e) => { if (e.target === bookmarksModalEl) closeBookmarksModal(); };

        if (historyBtnEl) historyBtnEl.onclick = showHistoryModal;
        if (closeHistoryModalBtnEl) closeHistoryModalBtnEl.onclick = closeHistoryModal;
        if (historyModalEl) historyModalEl.onclick = (e) => { if (e.target === historyModalEl) closeHistoryModal(); };
        if (clearAllHistoryBtnEl) clearAllHistoryBtnEl.onclick = clearAllGlobalHistory;
        
        if (themeSelectorEl) {
            themeSelectorEl.onchange = (event) => {
                const newTheme = event.target.value; applyTheme(newTheme); saveTheme(newTheme);
                if (currentTabId) {
                    const activeTabContent = document.getElementById(currentTabId);
                    if (activeTabContent) {
                        const iframe = activeTabContent.querySelector('iframe.tab-iframe');
                        const titleSpan = document.querySelector(`#${currentTabId}-btn .tab-title`);
                        if (iframe && iframe.srcdoc && iframe.srcdoc.includes("<h1 style=\"font-weight:lighter;font-size:2em;\">New Tab</h1>")) {
                             setNewTabPlaceholderContent(iframe, titleSpan); 
                        }
                    }
                }
            };
        }
        if (searchEngineSelectorEl) {
            searchEngineSelectorEl.onchange = (event) => {
                saveSearchEngineSetting(event.target.value);
            };
        }

        const newTabGlobalBtn = document.getElementById('newTabBtn');
        if (newTabGlobalBtn) newTabGlobalBtn.onclick = () => createTab(); // No URL, uses defaultHomepageUrl
        
        createTab(); // Create initial tab using default homepage
    });