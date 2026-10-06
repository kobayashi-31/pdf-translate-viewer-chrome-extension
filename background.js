const VIEWER = chrome.runtime.getURL('viewer.html');
const toViewer = (url) => `${VIEWER}?file=${encodeURIComponent(url)}`;

// Web上のPDF（http/https）は、読み込みの段階で行き先をビューアに差し替える。
// ページを開いてから移動し直す方式だと、PDFのページが履歴に残って「戻る」でループしてしまうため。
const PDF_URL_PATTERNS = [
  String.raw`^https?://[^?#]*\.pdf(\?.*)?$`, // 末尾が .pdf
  String.raw`^https?://([^/?#]+\.)?arxiv\.org/pdf/.*$`,
  String.raw`^https?://([^/?#]+\.)?openreview\.net/pdf.*$`,
];

async function installRedirectRules() {
  const rules = PDF_URL_PATTERNS.map((regexFilter, i) => ({
    id: i + 1,
    priority: 1,
    // \0 = 一致したURL全体。ビューアは file= 以降をそのままPDFのURLとして読む
    action: { type: 'redirect', redirect: { regexSubstitution: `${VIEWER}?file=\\0` } },
    condition: { regexFilter, isUrlFilterCaseSensitive: false, resourceTypes: ['main_frame'] },
  }));
  // ブラウザを閉じると消える「セッションの規則」を使い、拡張が起動するたびに登録し直す
  // （ディスクに保存する規則は、環境によって登録に失敗することがあったため）
  const old = await chrome.declarativeNetRequest.getSessionRules();
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map((r) => r.id), addRules: rules });
}
installRedirectRules().catch((e) => console.error('PDFの自動切り替えを登録できませんでした', e));

// PC内のPDF（file://）は上の仕組みが使えないので、開こうとした時点でビューアに切り替える
chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    chrome.tabs.update(details.tabId, { url: toViewer(details.url) });
  },
  { url: [{ schemes: ['file'], pathSuffix: '.pdf' }] }
);

// 自動で切り替わらなかったPDF用：アイコンをクリックで手動起動
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && !tab.url.startsWith(VIEWER)) {
    chrome.tabs.update(tab.id, { url: toViewer(tab.url) });
  }
});
