(async () => {
  const domain = location.hostname;
  const baseUrl = location.origin;

  // 1️⃣ Download the HTML
  const html = document.documentElement.outerHTML;
  chrome.runtime.sendMessage({
    action: "downloadFile",
    url: "data:text/html;charset=utf-8," + encodeURIComponent(html),
    filename: `${domain}/index.html`,
  });

  // 2️⃣ Collect all linked/static files
  const allUrls = new Set();

  // From HTML tags
  const selectors = [
    "link[href]",
    "script[src]",
    "img[src]",
    "source[src]",
    "video[src]",
    "audio[src]",
    "iframe[src]",
    "object[data]"
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const attr = el.getAttribute("src") || el.getAttribute("href") || el.getAttribute("data");
      if (attr) allUrls.add(new URL(attr, baseUrl).href);
    });
  });

  // From srcset
  document.querySelectorAll("img[srcset], source[srcset]").forEach(el => {
    const srcset = el.getAttribute("srcset");
    if (srcset) {
      srcset.split(",").forEach(s => {
        const url = s.trim().split(" ")[0];
        if (url) allUrls.add(new URL(url, baseUrl).href);
      });
    }
  });

  // From inline CSS style attributes
  document.querySelectorAll("[style]").forEach(el => {
    const style = el.getAttribute("style");
    const matches = style.match(/url\(['"]?([^'")]+)['"]?\)/g);
    if (matches) {
      matches.forEach(m => {
        const u = m.match(/url\(['"]?([^'")]+)['"]?\)/)[1];
        if (u) allUrls.add(new URL(u, baseUrl).href);
      });
    }
  });

  // From CSS files - extract URLs recursively (for fonts, bg images, SCSS, etc.)
  const cssLinks = [...document.querySelectorAll("link[rel='stylesheet']")].map(l => l.href);
  for (const cssUrl of cssLinks) {
    try {
      const res = await fetch(cssUrl);
      const text = await res.text();
      const urlsInCss = [...text.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1]);
      urlsInCss.forEach(u => {
        const full = new URL(u, cssUrl).href;
        allUrls.add(full);
      });
    } catch (e) {
      console.warn("Failed reading CSS:", cssUrl, e);
    }
  }

  // Add CSS and JS files themselves
  cssLinks.forEach(u => allUrls.add(u));
  [...document.querySelectorAll("script[src]")].forEach(s => allUrls.add(s.src));

  // 3️⃣ Send each file to background for download
  for (const fileUrl of allUrls) {
    try {
      const urlObj = new URL(fileUrl);
      const fullPath = `${urlObj.hostname}${urlObj.pathname}`;
      const cleanPath = fullPath.replace(/^\/+/, "");
      const filename = cleanPath.endsWith("/") ? cleanPath + "index.html" : cleanPath;

      chrome.runtime.sendMessage({
        action: "downloadFile",
        url: fileUrl,
        filename,
      });
    } catch (e) {
      console.warn("Error processing:", fileUrl, e);
    }
  }

  alert(`Downloading ${allUrls.size + 1} files including fonts, SCSS, and media.`);
})();
