(function () {
  "use strict";

  if (window.__pxnrV1Initialized) {
    return;
  }
  window.__pxnrV1Initialized = true;

  const currentUrl = safeUrl(window.location.href);
  if (!currentUrl || !isTargetNovelUrl(currentUrl)) {
    return;
  }

  chrome.storage.local.get({ enableViewer: true }, (res) => {
    if (!res.enableViewer) return;
    init();
  });

  function safeUrl(rawUrl, baseUrl) {
    try {
      return new URL(rawUrl, baseUrl);
    } catch (_error) {
      return null;
    }
  }

  function isTargetNovelUrl(parsed) {
    if (parsed.hostname !== "www.pixiv.net") return false;
    if (parsed.pathname.startsWith("/novel/series/")) return false;
    return parsed.pathname === "/novel/show.php" || parsed.pathname.startsWith("/novel/show/");
  }

  function init() {
    waitForNovelContainer().then((container) => {
      applySymmetricGridLayout(container);
    });
  }

  /**
   * Locates the primary novel text container.
   */
  function findNovelTextContainer(rootObj = document) {
    const selectors = [
      ".sc-1ncr0n9-0", ".sc-522197-0", ".sc-sz18z2-0", 
      "[data-gtm-category='novel']"
    ];
    for (const sel of selectors) {
      const nodes = rootObj.querySelectorAll(sel);
      for (const node of nodes) {
        if (isValidTextLength(node)) return node;
      }
    }
    
    // Generic fallback: search within <main> to avoid matching nav/header containers.
    const searchScope = rootObj.querySelector("main") || rootObj;
    const candidates = searchScope.querySelectorAll("div, article, section");
    for (const node of candidates) {
      if (isValidTextLength(node)) return node;
    }
    return null;
  }

  /**
   * Validates if a node contains sufficient text to be considered the novel body.
   */
  function isValidTextLength(node) {
    if (!node) return false;
    const textLen = (node.textContent || "").replace(/\s+/g, "").length;
    if (textLen < 300) return false;
    
    const aCount = node.querySelectorAll("a").length;
    if (aCount > 30) return false;
    
    return true;
  }

  /**
   * Waits for the novel text container to be rendered in the DOM.
   */
  function waitForNovelContainer() {
    return new Promise((resolve) => {
      const existing = findNovelTextContainer();
      if (existing) {
        resolve(existing);
        return;
      }
      const observer = new MutationObserver(() => {
        const found = findNovelTextContainer();
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  /**
   * Traverses up the DOM to identify the layout wrapper and applies a symmetric grid.
   */
  function applySymmetricGridLayout(container) {
    let current = container;
    let wrapperFound = false;
    let wrapperNode = null;
    let sidebarNode = null;

    let depth = 0;
    const MAX_DEPTH = 6;

    while (current && current.parentElement && depth < MAX_DEPTH) {
      const parent = current.parentElement;

      // Restrict traversal to prevent modifying global layout containers
      const tagName = parent.tagName.toLowerCase();
      if (tagName === "header" || tagName === "nav" || tagName === "body") {
        break;
      }

      const siblings = Array.from(parent.children).filter(node => node !== current);
      
      const foundSidebar = siblings.find(node => {
        const rect = node.getBoundingClientRect();
        const currentRect = current.getBoundingClientRect();
        
        // Ensure the sibling is positioned to the right of the current container
        const isRightSide = rect.left > currentRect.right - 10;
        const isBigEnough = rect.width > 50 && rect.height > 50;

        return isBigEnough && isRightSide;
      });

      if (foundSidebar) {
         wrapperNode = parent;
         sidebarNode = foundSidebar;
         wrapperFound = true;
         break;
      }

      current = parent;
      depth++;
    }

    if (wrapperFound && wrapperNode && sidebarNode) {
      wrapperNode.classList.add("pxnr-symmetric-wrapper");
      current.classList.add("pxnr-symmetric-main");
      sidebarNode.classList.add("pxnr-symmetric-sidebar");

      const updateSidebarWidth = () => {
        const w = sidebarNode.offsetWidth;
        const safeWidth = w > 50 ? w : 300; 
        wrapperNode.style.setProperty("--pxnr-sidebar-w", `${safeWidth}px`);
      };

      updateSidebarWidth();

      if (window.ResizeObserver) {
        const resizeObs = new ResizeObserver(() => updateSidebarWidth());
        resizeObs.observe(sidebarNode);
      } else {
        window.addEventListener("resize", updateSidebarWidth, { passive: true });
      }

      console.info("[pxnr] Symmetric grid layout applied.");
    } else {
      container.classList.add("pxnr-fallback-center");
      console.info("[pxnr] Applied fallback center layout.");
    }
  }

})();
