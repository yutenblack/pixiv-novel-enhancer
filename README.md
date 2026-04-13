<div align="center">
  <h1>Pixiv Novel Enhancer</h1>

  ![Chrome Extension](https://img.shields.io/badge/platform-Chrome_Extension-blue.svg)
  ![License](https://img.shields.io/badge/license-MIT-green.svg)

  **A Chrome extension that optimizes reading and searching for Pixiv novels.**<br>
  **Pixiv小説の閲覧および検索を最適化するChrome拡張機能です。**<br>
<br>
  <img src="https://github.com/user-attachments/assets/40bf95e9-d765-4f01-9d69-30f019e8de93" width="600" alt="Pixiv Novel Enhancer Screenshot">


  <p>
    <a href="#english">English</a> | <a href="#japanese">日本語</a>
  </p>
</div>

---

## <a id="english"></a> English

**Pixiv Novel Enhancer** improves your reading experience with a centered layout and configurable search filters.

### Features
1. **Reading Layout Optimization**: Centers the novel text container on reading pages. The native structure and sidebars are preserved and symmetrically aligned.
2. **Search Page Enhancements**:
   - **Bookmark Filtering**: Hides novels from search results that fail to meet a user-defined bookmark threshold.
   - **Tag Mute**: Registers tags in the extension popup (e.g. "死ネタ", specific ship names) and permanently hides any works carrying those tags from search results. Multiple tags can be registered; a work is hidden if it matches any one of them (exact match).
   - **Infinite Scrolling**: Automatically loads and appends the next page when reaching the bottom of the search results view. *(Note: Infinite scrolling is not implemented on novel reading pages.)*

### Usage
1. Click the green **Code** button at the top of this repository, select **Download ZIP**, and extract the downloaded folder.
2. Open the Extensions management page in Chrome (`chrome://extensions/`).
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** and select the directory containing the extension files.
5. Visit any Pixiv novel reading page or search page to see the features in action.
   - **Configuration**: Click the extension icon to open the popup menu. Toggle the reading layout and search filter independently. To mute tags, enter a tag name in the **Tag Mute** field and press Enter or click **+**. Registered tags are shown as badges and can be removed individually or cleared all at once.

### Notice
Feel free to modify and reuse this extension as you like.
Please note that no warranty or continuous support is provided as this is actively under development.

---

<br/>

## <a id="japanese"></a> 日本語

**Pixiv Novel Enhancer**は、Pixiv小説の閲覧体験を向上させ、検索時のノイズを減らすためのChrome拡張機能です。

### 主な機能
1. **リーダーレイアウトの最適化**: 小説の閲覧ページにおいて、サイドバー等の既存UIを保持したまま、本文コンテナを画面中央に配置します。
2. **検索結果の拡張**: 検索一覧ページにおいて、以下の機能を提供します。
   - **ブックマーク数フィルタリング**: 設定パネルで指定した最低ブックマーク数に満たない作品を非表示にします。
   - **タグミュート**: 拡張機能のポップアップでタグ（例：「死ネタ」「特定のCP名」など）を登録しておくと、そのタグを持つ作品を検索結果からDOMごと非表示にします。複数登録可能で、いずれか1つでも一致した作品が非表示になります（完全一致）。
   - **無限スクロール**: ページ末尾に到達した際、自動的に次ページの検索結果を追加します。（※小説閲覧ページ側の無限スクロール機能は含まれません）

### 利用方法
1. リポジトリ上部にある緑色の「**Code**」ボタンをクリックし、「**Download ZIP**」を選択してダウンロードしたファイルを解凍（展開）します。
2. Chromeブラウザの拡張機能管理画面 (`chrome://extensions/`) を開きます。
3. 右上の「デベロッパーモード」を有効にします。
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、展開したフォルダを選択します。
5. Pixivの小説閲覧ページ、または小説検索ページを開くと拡張機能が適用されます。
   - **設定の変更**: ブラウザのアドレスバー横にある拡張機能アイコンをクリックすると設定パネルが表示されます。リーダー表示とフィルタ機能のオン・オフを個別に切り替えられます。タグミュートは「**Tag Mute**」欄にタグ名を入力してEnterキーまたは「**+**」ボタンで登録します。登録済みタグはバッジ形式で表示され、個別削除または「**Clear all**」で一括削除できます。

### 免責事項
自由に改変・再利用してください。
完全な動作保証や継続的なサポートは提供しておりません。
