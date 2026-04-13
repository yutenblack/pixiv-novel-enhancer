(() => {
  "use strict";

  const STORAGE_KEY = "pxnr_bookmark_threshold";
  const DEFAULT_THRESHOLD = 100;
  const MUTE_TAGS_KEY = "pxnr_mute_tags";

  function getThreshold() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const val = parseInt(saved, 10);
      if (!isNaN(val)) return val;
    }
    return DEFAULT_THRESHOLD;
  }

  function setThreshold(val) {
    window.localStorage.setItem(STORAGE_KEY, val);
  }

  let currentThreshold = getThreshold();
  let mutedTags = [];
  let filterEnabled = false;
  let uiContainer = null;
  let lastUrl = location.href;

  function isTagSearchPage() {
    return /\/tags\/[^/]+\/novels/.test(location.pathname);
  }

  function extractNovelIdFromHref(href) {
      const match = /\/novel\/show(?:\.php\?id=|\/)(\d+)/.exec(href);
      return match ? match[1] : null;
  }

  function getCardContainer(linkElement, contextDoc = document) {
    let li = linkElement.closest('li');
    if (li) return li;

    let current = linkElement;
    let fallback = linkElement;
    const limitNode = contextDoc.body || contextDoc.documentElement;

    while (current && current !== limitNode) {
        const otherTitles = current.querySelectorAll('a[href*="/novel/show"]');
        const distinctHrefs = new Set(
            Array.from(otherTitles)
              .map(a => extractNovelIdFromHref(a.href))
              .filter(Boolean)
        );
        
        if (distinctHrefs.size > 1) {
            return fallback;
        }
        
        fallback = current;
        current = current.parentElement;
    }
    return fallback;
  }

  function getBookmarkCount(cardElement) {
    let maxFoundValue = 0;
    const walker = document.createTreeWalker(cardElement, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      const text = (node.nodeValue || "").trim();
      if (/^[0-9,]+$/.test(text) && text.length > 0) {
        const val = parseInt(text.replace(/,/g, ""), 10);
        if (val < 1000000 && val > maxFoundValue) {
          maxFoundValue = val;
        }
      }
    }

    if (maxFoundValue === 0) {
       const allSpans = cardElement.querySelectorAll("span, div");
       for (const el of allSpans) {
           const aria = el.getAttribute("aria-label");
           if (aria && (aria.includes("ブックマーク") || aria.includes("いいね"))) {
               const match = (el.textContent || "").match(/([0-9,]+)/);
               if (match) {
                   const val = parseInt(match[1].replace(/,/g, ""), 10);
                   if (val < 1000000 && val > maxFoundValue) maxFoundValue = val;
               }
           }
       }
    }
    return maxFoundValue;
  }

  /**
   * Returns an array of tag strings found within a card element.
   * Tags are identified by anchor elements linking to pixiv tag pages.
   */
  function getTagsFromCard(cardElement) {
    const tagAnchors = cardElement.querySelectorAll('a[href*="/tags/"]');
    const tags = [];
    for (const anchor of tagAnchors) {
      const text = (anchor.textContent || "").trim();
      if (text) tags.push(text);
    }
    return tags;
  }

  /**
   * Returns true if any of the card's tags match an entry in mutedTags (exact match).
   */
  function isMutedByTag(cardElement) {
    if (mutedTags.length === 0) return false;
    const cardTags = getTagsFromCard(cardElement);
    return cardTags.some((tag) => mutedTags.includes(tag));
  }

  function applyFilterToCard(card, link) {
    if (card.dataset.pxnrCardFiltered === "true") {
      link.dataset.pxnrLinkChecked = "true";
      return;
    }
    const count = getBookmarkCount(card);
    card.style.display = "";
    if (count < currentThreshold || isMutedByTag(card)) {
      card.style.display = "none";
    }
    card.dataset.pxnrCardFiltered = "true";
    link.dataset.pxnrLinkChecked = "true";
  }

  /* --- Infinite Scroll Implementation --- */
  let currentPageNum = 1;
  let isFetchingNextPage = false;
  const seenNovelIds = new Set();
  const iframes = []; 
  
  let autoPagerObserver = null;
  let autoPagerTrigger = null;

  function getNextPageUrl() {
      try {
          const url = new URL(window.location.href);
          url.searchParams.set("p", currentPageNum + 1);
          return url.href;
      } catch(e) { return null; }
  }

  function initAutoPager() {
      const novelLinks = document.querySelectorAll('a[href*="/novel/show"]');
      for (const link of novelLinks) {
          const id = extractNovelIdFromHref(link.href);
          if (id) seenNovelIds.add(id);
      }
      const url = new URL(window.location.href);
      const p = url.searchParams.get("p");
      if (p) {
          currentPageNum = parseInt(p, 10) || 1;
      }

      if (autoPagerObserver) autoPagerObserver.disconnect();
      if (autoPagerTrigger && autoPagerTrigger.parentNode) {
          autoPagerTrigger.parentNode.removeChild(autoPagerTrigger);
      }

      let insertTarget = document.body;
      const cLinks = document.querySelectorAll('a[href*="/novel/show"]');
      if (cLinks.length > 0) {
          const lastC = getCardContainer(cLinks[cLinks.length - 1], document);
          if (lastC && lastC.parentElement) {
              insertTarget = lastC.parentElement.parentElement || document.body;
          }
      }

      autoPagerTrigger = document.createElement('div');
      autoPagerTrigger.id = "pxnr-scroll-trigger";
      autoPagerTrigger.style.height = "1px";
      autoPagerTrigger.style.width = "100%";
      autoPagerTrigger.style.background = "transparent";
      insertTarget.appendChild(autoPagerTrigger);

      autoPagerObserver = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              loadNextPage();
          }
      }, { rootMargin: '0px 0px 2500px 0px' });
      
      autoPagerObserver.observe(autoPagerTrigger);
  }

  function destroySearchFilter() {
    if (uiContainer && uiContainer.parentNode) {
      uiContainer.parentNode.removeChild(uiContainer);
    }
    uiContainer = null;
    if (autoPagerObserver) {
      autoPagerObserver.disconnect();
      autoPagerObserver = null;
    }
    if (autoPagerTrigger && autoPagerTrigger.parentNode) {
      autoPagerTrigger.parentNode.removeChild(autoPagerTrigger);
    }
    autoPagerTrigger = null;
    iframes.length = 0;
    currentPageNum = 1;
    isFetchingNextPage = false;
    seenNovelIds.clear();
  }

  function initSearchFilter() {
    createUI();
    resetAndFilterNovels();
    window.setTimeout(() => {
      resetAndFilterNovels();
      initAutoPager();
    }, 1000);
  }

  async function loadNextPage() {
      if (isFetchingNextPage) return;
      
      const nextUrl = getNextPageUrl();
      if (!nextUrl) return;

      isFetchingNextPage = true;
      let frame = null;
      let divider = null;

      try {
          if (!autoPagerTrigger || !autoPagerTrigger.parentNode) {
              isFetchingNextPage = false;
              return;
          }
          
          const insertTarget = autoPagerTrigger.parentNode;
          const insertBeforeNode = autoPagerTrigger;

          divider = document.createElement('div');
          divider.className = "pxnr-page-divider";
          divider.style.textAlign = 'center';
          divider.style.borderTop = '1px solid #eaeaea';
          divider.style.color = '#bbb';
          divider.style.backgroundColor = 'transparent';
          divider.style.fontSize = '12px';
          divider.style.letterSpacing = '2px';
          divider.style.paddingTop = '10px';
          divider.style.margin = '30px auto';
          divider.style.maxWidth = '1200px';
          divider.textContent = `PAGE ${currentPageNum + 1}`;
          
          insertTarget.insertBefore(divider, insertBeforeNode);

          frame = document.createElement('iframe');
          frame.style.width = '100%';
          frame.style.height = '1px';
          frame.style.opacity = '0';
          frame.style.border = 'none';
          frame.style.display = 'block';
          frame.style.transition = 'opacity 0.2s';
          frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');

          let iframeDoc;

          const listContainer = await new Promise((resolve) => {
              let resolved = false;
              let pollingInterval = null;

              function done(value) {
                  if (resolved) return;
                  resolved = true;
                  if (pollingInterval) clearInterval(pollingInterval);
                  resolve(value);
              }

              function startPolling() {
                  if (resolved) return;
                  let attempts = 0;
                  pollingInterval = setInterval(() => {
                      attempts++;
                      try {
                          iframeDoc = frame.contentDocument || frame.contentWindow.document;
                          if (!iframeDoc) return;

                          const links = iframeDoc.querySelectorAll('a[href*="/novel/show"]');
                          if (links.length > 0) {
                              const card = getCardContainer(links[0], iframeDoc);
                              done(card && card.parentElement ? card.parentElement : null);
                              return;
                          }
                      } catch (e) {}

                      if (attempts > 60) {  // 60 × 50ms = 3s after load
                          done(null);
                      }
                  }, 50);
              }

              // Start polling once the iframe HTML is ready.
              frame.addEventListener('load', startPolling);

              // Hard timeout in case the load event never fires.
              setTimeout(() => done(null), 12000);

              // Set src after the listener is registered, then insert.
              frame.src = nextUrl;
              insertTarget.insertBefore(frame, insertBeforeNode);
              iframes.push(frame);
          });

          if (listContainer) {
              let current = listContainer;
              while (current && current !== iframeDoc.body && current !== iframeDoc.documentElement) {
                  let prev = current.previousElementSibling;
                  while (prev) {
                      prev.style.setProperty('display', 'none', 'important');
                      prev = prev.previousElementSibling;
                  }
                  let next = current.nextElementSibling;
                  while (next) {
                      next.style.setProperty('display', 'none', 'important');
                      next = next.nextElementSibling;
                  }
                  current = current.parentElement;
              }

              const baseTag = iframeDoc.createElement('base');
              baseTag.target = "_parent";
              iframeDoc.head.appendChild(baseTag);

              // Remove all vertical spacing on wrapper elements to prevent blank space
              // above and below the visible card list. Siblings are hidden, but
              // intermediate wrappers may still carry padding / margin.
              let wrapperEl = listContainer.parentElement;
              while (wrapperEl && wrapperEl !== iframeDoc.body && wrapperEl !== iframeDoc.documentElement) {
                  wrapperEl.style.paddingTop = '0';
                  wrapperEl.style.marginTop = '0';
                  wrapperEl.style.paddingBottom = '0';
                  wrapperEl.style.marginBottom = '0';
                  wrapperEl = wrapperEl.parentElement;
              }

              const resetStyle = iframeDoc.createElement('style');
              resetStyle.textContent = `
                  body, html {
                      margin: 0 !important;
                      padding: 0 !important;
                      background: transparent !important;
                  }
              `;
              iframeDoc.head.appendChild(resetStyle);

              iframeDoc.body.style.setProperty('overflow', 'hidden', 'important');
              if (iframeDoc.scrollingElement) {
                  iframeDoc.scrollingElement.style.setProperty('overflow', 'hidden', 'important');
              }

              const novelLinks = iframeDoc.querySelectorAll('a[href*="/novel/show"]');
              for (const link of novelLinks) {
                  link.addEventListener('click', (e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          window.top.location.href = link.href;
                      }
                  }, true);

                  const card = getCardContainer(link, iframeDoc);
                  if (card) {
                      applyFilterToCard(card, link);
                      const id = extractNovelIdFromHref(link.href);
                      if (id) seenNovelIds.add(id);
                  }
              }

              // Reset iframe height to 1px to accurately recalculate the scroll height.
              frame.style.setProperty('height', '1px', 'important');
              const cs = iframeDoc.scrollingElement ? iframeDoc.scrollingElement.scrollHeight : iframeDoc.body.scrollHeight;
              frame.style.setProperty('height', cs + 'px', 'important');
              frame.style.setProperty('opacity', '1', 'important');
              
              currentPageNum++;
              isFetchingNextPage = false;

              if (autoPagerTrigger && autoPagerObserver) {
                  autoPagerObserver.unobserve(autoPagerTrigger);
                  autoPagerObserver.observe(autoPagerTrigger);
              }

          } else {
              if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
              if (divider && divider.parentNode) divider.parentNode.removeChild(divider);
              const idx = iframes.indexOf(frame);
              if (idx > -1) iframes.splice(idx, 1);
              if (autoPagerObserver && autoPagerTrigger) autoPagerObserver.unobserve(autoPagerTrigger);
              isFetchingNextPage = false;
          }
      } catch (err) {
          if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
          if (divider && divider.parentNode) divider.parentNode.removeChild(divider);
          const idx = iframes.indexOf(frame);
          if (idx > -1) iframes.splice(idx, 1);
          isFetchingNextPage = false;
      }
  }

  function filterNovels() {
    const novelLinks = document.querySelectorAll('a[href*="/novel/show"]');
    for (const link of novelLinks) {
      if (link.dataset.pxnrLinkChecked === "true") continue;
      
      const card = getCardContainer(link);
      if (!card) {
          link.dataset.pxnrLinkChecked = "true";
          continue;
      }
      applyFilterToCard(card, link);
    }
  }

  function resetAndFilterNovels() {
    const processedLinks = document.querySelectorAll('[data-pxnr-link-checked="true"]');
    for (const link of processedLinks) {
      delete link.dataset.pxnrLinkChecked;
    }
    const processedCards = document.querySelectorAll('[data-pxnr-card-filtered="true"]');
    for (const card of processedCards) {
      delete card.dataset.pxnrCardFiltered;
      card.style.display = ""; 
    }
    filterNovels();

    for (const frame of iframes) {
        try {
            const iframeDoc = frame.contentDocument || frame.contentWindow.document;
            const ifProcessedLinks = iframeDoc.querySelectorAll('[data-pxnr-link-checked="true"]');
            for (const link of ifProcessedLinks) {
                delete link.dataset.pxnrLinkChecked;
            }
            const ifProcessedCards = iframeDoc.querySelectorAll('[data-pxnr-card-filtered="true"]');
            for (const card of ifProcessedCards) {
                delete card.dataset.pxnrCardFiltered;
                card.style.display = "";
            }
            
            const novelLinks = iframeDoc.querySelectorAll('a[href*="/novel/show"]');
            for (const link of novelLinks) {
                const card = getCardContainer(link, iframeDoc);
                if (card) applyFilterToCard(card, link);
            }

            // Reset iframe height to adapt to dynamically hidden elements.
            frame.style.setProperty('height', '1px', 'important');
            const cs = iframeDoc.scrollingElement ? iframeDoc.scrollingElement.scrollHeight : iframeDoc.body.scrollHeight;
            frame.style.setProperty('height', cs + 'px', 'important');
        } catch(e) { }
    }

    // Refresh the intersection observer in case the elements' height decreased.
    setTimeout(() => {
        if (autoPagerTrigger && autoPagerObserver) {
            autoPagerObserver.unobserve(autoPagerTrigger);
            autoPagerObserver.observe(autoPagerTrigger);
        }
    }, 150);
  }

  function createUI() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "24px";
    container.style.right = "24px";
    container.style.padding = "12px 18px";
    container.style.backgroundColor = "rgba(255, 255, 255, 0.85)";
    container.style.backdropFilter = "blur(12px)";
    container.style.webkitBackdropFilter = "blur(12px)";
    container.style.borderRadius = "24px";
    container.style.zIndex = "999999";
    container.style.display = "flex";
    container.style.gap = "10px";
    container.style.alignItems = "center";
    container.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.05)";
    container.style.border = "1px solid rgba(255, 255, 255, 0.5)";
    container.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    // Bookmark Icon (SVG)
    const iconWrapper = document.createElement("div");
    iconWrapper.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #0096fa; margin-top: 2px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
    iconWrapper.style.display = "flex";
    iconWrapper.style.alignItems = "center";
    iconWrapper.title = "Bookmarks Filter";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = currentThreshold;
    input.title = "Min Bookmarks";
    input.style.width = "70px";
    input.style.padding = "6px 8px";
    input.style.border = "1px solid #e1e8ed";
    input.style.borderRadius = "6px";
    input.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    input.style.outline = "none";
    input.style.fontSize = "14px";
    input.style.fontWeight = "600";
    input.style.color = "#1f1f1f";
    input.style.transition = "border-color 0.2s";
    
    input.addEventListener("focus", () => input.style.border = "1px solid #0096fa");
    input.addEventListener("blur", () => input.style.border = "1px solid #e1e8ed");

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "Filter";
    applyBtn.style.cursor = "pointer";
    applyBtn.style.padding = "6px 14px";
    applyBtn.style.border = "none";
    applyBtn.style.borderRadius = "16px";
    applyBtn.style.backgroundColor = "#0096fa"; 
    applyBtn.style.color = "#fff";
    applyBtn.style.fontWeight = "600";
    applyBtn.style.fontSize = "13px";
    applyBtn.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    
    applyBtn.onmouseover = () => applyBtn.style.backgroundColor = "#007acc";
    applyBtn.onmouseout = () => applyBtn.style.backgroundColor = "#0096fa";
    applyBtn.onmousedown = () => applyBtn.style.transform = "scale(0.95)";
    applyBtn.onmouseup = () => applyBtn.style.transform = "scale(1)";

    // Clear Button
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.padding = "6px 14px";
    clearBtn.style.border = "1px solid #cfd9e0";
    clearBtn.style.borderRadius = "16px";
    clearBtn.style.backgroundColor = "transparent"; 
    clearBtn.style.color = "#536471";
    clearBtn.style.fontWeight = "600";
    clearBtn.style.fontSize = "13px";
    clearBtn.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    
    clearBtn.onmouseover = () => clearBtn.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    clearBtn.onmouseout = () => clearBtn.style.backgroundColor = "transparent";
    clearBtn.onmousedown = () => clearBtn.style.transform = "scale(0.95)";
    clearBtn.onmouseup = () => clearBtn.style.transform = "scale(1)";

    applyBtn.addEventListener("click", () => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val >= 0) {
        currentThreshold = val;
        setThreshold(val);
        resetAndFilterNovels();
      }
    });

    clearBtn.addEventListener("click", () => {
      input.value = "0";
      currentThreshold = 0;
      setThreshold(0);
      resetAndFilterNovels();
    });

    container.appendChild(iconWrapper);
    container.appendChild(input);
    container.appendChild(applyBtn);
    container.appendChild(clearBtn);
    uiContainer = container;
    document.body.appendChild(container);
  }

  let isScheduled = false;
  let reinitTimeout = null;
  const observer = new MutationObserver(() => {
    // Detect SPA navigation (URL change within the same document).
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (filterEnabled) {
        if (reinitTimeout) clearTimeout(reinitTimeout);
        reinitTimeout = setTimeout(() => {
          reinitTimeout = null;
          if (isTagSearchPage()) {
            destroySearchFilter();
            initSearchFilter();
          } else if (uiContainer) {
            destroySearchFilter();
          }
        }, 300);
      }
    }

    if (!isTagSearchPage()) return;
    if (isScheduled) return;
    isScheduled = true;
    window.requestAnimationFrame(() => {
      isScheduled = false;
      filterNovels();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Reflect tag list / filter state changes made in the popup without reloading the page.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[MUTE_TAGS_KEY]) {
      mutedTags = changes[MUTE_TAGS_KEY].newValue || [];
      if (isTagSearchPage()) resetAndFilterNovels();
    }
    if ('enableFilter' in changes) {
      filterEnabled = changes.enableFilter.newValue;
    }
  });

  chrome.storage.local.get({ enableFilter: true, [MUTE_TAGS_KEY]: [] }, (res) => {
    filterEnabled = res.enableFilter;
    if (!res.enableFilter) return;
    mutedTags = res[MUTE_TAGS_KEY] || [];
    if (!isTagSearchPage()) return;  // Loaded on a non-search page; wait for SPA navigation.
    initSearchFilter();
  });

})();
