document.addEventListener('DOMContentLoaded', () => {
  const toggleViewer = document.getElementById('toggle-viewer');
  const toggleFilter = document.getElementById('toggle-filter');
  const muteTagInput = document.getElementById('mute-tag-input');
  const muteTagAddBtn = document.getElementById('mute-tag-add-btn');
  const tagBadgeList = document.getElementById('tag-badge-list');
  const tagCountBadge = document.getElementById('tag-count-badge');
  const muteTagsSection = document.getElementById('mute-tags-section');

  const MUTE_TAGS_KEY = 'pxnr_mute_tags';

  let mutedTags = [];

  // ストレージから設定を読み込み
  chrome.storage.local.get({ enableViewer: true, enableFilter: true, [MUTE_TAGS_KEY]: [] }, (res) => {
    toggleViewer.checked = res.enableViewer;
    toggleFilter.checked = res.enableFilter;
    mutedTags = res[MUTE_TAGS_KEY] || [];
    renderTagBadges();
    updateMuteTagsSectionState(res.enableFilter);
  });

  // トグル: リーダー表示
  toggleViewer.addEventListener('change', (e) => {
    chrome.storage.local.set({ enableViewer: e.target.checked }, () => {
      reloadPixivTabs();
    });
  });

  // トグル: Smart Filter
  toggleFilter.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enableFilter: isEnabled }, () => {
      reloadPixivTabs();
    });
    updateMuteTagsSectionState(isEnabled);
  });

  // タグ追加
  function addTag() {
    const val = muteTagInput.value.trim();
    if (!val) return;
    if (mutedTags.includes(val)) {
      muteTagInput.value = '';
      return;
    }
    mutedTags = [...mutedTags, val];
    muteTagInput.value = '';
    saveMutedTags();
    renderTagBadges();
  }

  muteTagAddBtn.addEventListener('click', addTag);

  muteTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });

  // タグ削除
  function removeTag(tag) {
    mutedTags = mutedTags.filter((t) => t !== tag);
    saveMutedTags();
    renderTagBadges();
  }

  // ストレージへ保存（search-filter.js の onChanged が自動検知する）
  function saveMutedTags() {
    chrome.storage.local.set({ [MUTE_TAGS_KEY]: mutedTags });
  }

  // バッジ一覧を再描画
  function renderTagBadges() {
    tagBadgeList.innerHTML = '';
    tagCountBadge.textContent = mutedTags.length;

    for (const tag of mutedTags) {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.textContent = tag;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-badge-remove';
      removeBtn.title = 'タグを削除';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => removeTag(tag));

      badge.appendChild(removeBtn);
      tagBadgeList.appendChild(badge);
    }
  }

  // Smart Filter が OFF のときタグセクションをグレーアウト
  function updateMuteTagsSectionState(isFilterEnabled) {
    if (isFilterEnabled) {
      muteTagsSection.classList.remove('disabled');
    } else {
      muteTagsSection.classList.add('disabled');
    }
  }

  // 対象タブを一括リロード
  function reloadPixivTabs() {
    chrome.tabs.query({ url: '*://*.pixiv.net/*' }, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.reload(tab.id);
      }
    });
  }
});

