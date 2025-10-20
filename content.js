(async () => {
  const domain = location.hostname;
  const baseUrl = location.origin;

  // Step 1️⃣: Download main HTML
  const html = document.documentElement.outerHTML;
  chrome.runtime.sendMessage({
    action: "downloadFile",
    url: "data:text/html;charset=utf-8," + encodeURIComponent(html),
    filename: `${domain}/index.html`,
  });

  // Step 2️⃣: Collect basic assets
  const cssLinks = [...document.querySelectorAll("link[rel='stylesheet']")].map(l => l.href);
  const jsLinks = [...document.querySelectorAll("script[src]")].map(s => s.src);
  const images = [...document.images].map(i => i.src);
  const media = [...document.querySelectorAll("video[src], audio[src], source[src]")]
    .map(m => m.src)
    .filter(Boolean);
  const objects = [...document.querySelectorAll("object[data]")].map(o => o.data);

  const srcsets = [...document.querySelectorAll("img[srcset], source[srcset]")]
    .flatMap(el => (el.getAttribute("srcset") || "").split(",").map(s => s.trim().split(" ")[0]))
    .filter(Boolean);

  const inlineStyleAssets = [...document.querySelectorAll("[style]")]
    .flatMap(el => {
      const style = el.getAttribute("style");
      const matches = style ? [...style.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)] : [];
      return matches.map(m => m[1]);
    });

  const initialAssets = [
    ...cssLinks,
    ...jsLinks,
    ...images,
    ...media,
    ...objects,
    ...srcsets,
    ...inlineStyleAssets,
  ]
    .filter(Boolean)
    .map(url => new URL(url, baseUrl).href);

  const allAssets = new Set(initialAssets);

  // Step 3️⃣: Recursively extract assets from CSS files (fonts, bg images, etc.)
  for (const cssUrl of cssLinks) {
    try {
      const res = await fetch(cssUrl);
      if (!res.ok) continue;
      const text = await res.text();

      // Find all url() references (fonts, images, svg, etc.)
      const urlsInCss = [...text.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1]);

      // Find SCSS @import statements
      const imports = [...text.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(m => m[1]);

      [...urlsInCss, ...imports].forEach(u => {
        try {
          const full = new URL(u, cssUrl).href;
          allAssets.add(full);
        } catch { }
      });
    } catch (e) {
      console.warn("CSS read failed:", cssUrl, e);
    }
  }

  // Step 4️⃣: Queue all unique assets for download
  for (const fileUrl of allAssets) {
    try {
      const urlObj = new URL(fileUrl);
      const path = urlObj.hostname + urlObj.pathname;
      const cleanPath = path.replace(/^\/+/, "");
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

  console.log(`Downloading ${allAssets.size + 1} files including fonts, SVGs, SCSS, and media.`);
})();
