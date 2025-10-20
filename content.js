(async () => {
  const domain = location.hostname;
  const baseUrl = location.origin;

  // Step 1: Download main HTML
  const html = document.documentElement.outerHTML;
  chrome.runtime.sendMessage({
    action: "downloadFile",
    url: "data:text/html;charset=utf-8," + encodeURIComponent(html),
    filename: `${domain}/index.html`,
  });

  // Step 2: Collect resource URLs
  const cssLinks = [...document.querySelectorAll("link[rel='stylesheet']")].map(l => l.href);
  const jsLinks = [...document.querySelectorAll("script[src]")].map(s => s.src);
  const images = [...document.images].map(i => i.src);
  const srcsets = [...document.querySelectorAll("img[srcset], source[srcset]")]
    .flatMap(el => (el.getAttribute("srcset") || "").split(",").map(s => s.trim().split(" ")[0]))
    .filter(Boolean);

  const allFiles = [...new Set([...cssLinks, ...jsLinks, ...images, ...srcsets])]
    .filter(Boolean)
    .map(url => new URL(url, baseUrl).href);

  // Step 3: Queue downloads preserving structure
  for (const fileUrl of allFiles) {
    try {
      const urlObj = new URL(fileUrl);
      const path = urlObj.hostname + urlObj.pathname; // includes domain and path
      const cleanPath = path.replace(/^\/+/, ""); // remove leading slashes
      const filename = cleanPath.endsWith("/") ? cleanPath + "index.html" : cleanPath;

      chrome.runtime.sendMessage({
        action: "downloadFile",
        url: fileUrl,
        filename,
      });
    } catch (e) {
      console.warn("Error processing URL:", fileUrl, e);
    }
  }

  alert(`Downloading ${allFiles.length + 1} files. Existing files will be replaced.`);
})();
