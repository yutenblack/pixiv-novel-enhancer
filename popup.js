document.addEventListener('DOMContentLoaded', () => {
  const toggleViewer = document.getElementById('toggle-viewer');
  const toggleFilter = document.getElementById('toggle-filter');

  // ストレージから設定を読み込み
  chrome.storage.local.get({ enableViewer: true, enableFilter: true }, (res) => {
    toggleViewer.checked = res.enableViewer;
    toggleFilter.checked = res.enableFilter;
  });

  // 設定変更時の処理
  toggleViewer.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enableViewer: isEnabled }, () => {
      reloadPixivTabs();
    });
  });

  toggleFilter.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enableFilter: isEnabled }, () => {
      reloadPixivTabs();
    });
  });

  // 対象タブを一括リロード
  function reloadPixivTabs() {
    chrome.tabs.query({ url: "*://*.pixiv.net/*" }, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.reload(tab.id);
      }
    });
  }
});
