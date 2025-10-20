chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "downloadFile" && msg.url && msg.filename) {
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename,
      conflictAction: "overwrite", // always replace if exists
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.warn("Download failed:", chrome.runtime.lastError.message, msg.url);
      }
    });
  }
});
