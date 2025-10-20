(async () => {
  const domain = location.hostname;
  const baseUrl = location.origin;

  // Step 1️⃣: Download main HTML

  // 🧩 Step 1️⃣: Generate dynamic HTML filename based on current page
  let pagePath = location.pathname;
  if (pagePath === "/" || pagePath === "") pagePath = "/index.html";
  else if (!pagePath.endsWith(".html")) pagePath += ".html";

  const htmlFilename = `${domain}${pagePath}`;

  // Download main HTML
  const html = document.documentElement.outerHTML;
  chrome.runtime.sendMessage({
    action: "downloadFile",
    url: "data:text/html;charset=utf-8," + encodeURIComponent(html),
    filename: htmlFilename.replace(/^\/+/, ""),
  });

  // Step 2️⃣: Collect main asset URLs
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

  // Inline styles with background URLs
  const inlineStyleAssets = [...document.querySelectorAll("[style]")]
    .flatMap(el => {
      const style = el.getAttribute("style");
      const matches = style ? [...style.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)] : [];
      return matches.map(m => m[1]);
    });

  // 🆕 Helper to check if a value looks like a static file URL
  const isStaticFile = (val) => {
    if (!val) return false;
    const staticExtensions = [
      ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
      ".mp4", ".webm", ".ogg", ".mp3", ".wav", ".m4a",
      ".woff", ".woff2", ".ttf", ".otf", ".eot",
      ".css", ".scss", ".js", ".json", ".xml", ".ico",
      ".avif", ".heic", ".heif", ".txt", ".pdf"
    ];
    // Remove query params and hashes for clean check
    const cleanVal = val.split("?")[0].split("#")[0];
    return staticExtensions.some(ext => cleanVal.toLowerCase().endsWith(ext));
  };

  // 🆕 Custom attributes for lazy-loading or background images
  const customAttributes = [
    "data-background",
    "data-bg",
    "data-src",
    "data-lazy",
    "data-original",
    "data-bgset",
    "data-image",
    "data-fullsrc"
  ];

  const customAssets = [];
  customAttributes.forEach(attr => {
    document.querySelectorAll(`[${attr}]`).forEach(el => {
      const val = el.getAttribute(attr);
      if (val && isStaticFile(val)) {
        customAssets.push(val);
      }
    });
  });

  // Combine all initial assets
  const initialAssets = [
    ...cssLinks,
    ...jsLinks,
    ...images,
    ...media,
    ...objects,
    ...srcsets,
    ...inlineStyleAssets,
    ...customAssets,
  ]
    .filter(Boolean)
    .map(url => new URL(url, baseUrl).href);

  const allAssets = new Set(initialAssets);

  // Step 3️⃣: Recursively extract URLs from CSS files
  for (const cssUrl of cssLinks) {
    try {
      const res = await fetch(cssUrl);
      if (!res.ok) continue;
      const text = await res.text();

      // Extract url(...) patterns (fonts, images, etc.)
      const urlsInCss = [...text.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1]);
      // Extract SCSS @import statements
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

  // Step 4️⃣: Queue downloads, preserving folder paths
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

  console.log(`Downloading ${allAssets.size + 1} files — including fonts, videos, SVGs, SCSS, and data-* assets.`);
})();
