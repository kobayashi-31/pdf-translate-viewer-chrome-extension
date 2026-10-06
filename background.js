const VIEWER = chrome.runtime.getURL('viewer.html');
const toViewer = (url) => `${VIEWER}?file=${encodeURIComponent(url)}`;

// PDFっぽいURLを開いたら、自前ビューアに切り替える
chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    chrome.tabs.update(details.tabId, { url: toViewer(details.url) });
  },
  {
    url: [
      { schemes: ['http', 'https'], pathSuffix: '.pdf' },
      { schemes: ['file'], pathSuffix: '.pdf' },
      { hostSuffix: 'arxiv.org', pathPrefix: '/pdf/' },
      { hostSuffix: 'openreview.net', pathPrefix: '/pdf' }
    ]
  }
);

// 自動で切り替わらなかったPDF用：アイコンをクリックで手動起動
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && !tab.url.startsWith(VIEWER)) {
    chrome.tabs.update(tab.id, { url: toViewer(tab.url) });
  }
});
