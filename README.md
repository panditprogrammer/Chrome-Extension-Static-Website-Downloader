# Web Snapping




## What this chrome extension does


- Crawls through HTML, CSS, and inline style references

- Extracts URLs for all static assets

- Preserves exact server folder structure

- Automatically overwrites existing files

- Supports other assets: fonts, SCSS, media, JSON, etc.


| Feature                                  | Description                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| 🧱 HTML, CSS, JS                         | Captures `index.html`, linked stylesheets, and scripts                  |
| 🖼️ Images, Fonts, Media                 | Downloads `.png`, `.jpg`, `.svg`, `.woff`, `.ttf`, `.mp4`, `.mp3`, etc. |
| 🎨 SCSS / @font-face / background images | Parses CSS files for `url(...)` references and downloads them           |
| 🧭 Folder Structure                      | Preserves the **exact path** like `/html/assets/images/banner/...`      |
| 🔁 Overwrite                             | Replaces existing files automatically (`conflictAction: "overwrite"`)   |
| 🧰 Base Folder                           | Everything is stored in `/Downloads/{domain}/`                          |
| ⚡ Manifest V3                            | Works with the latest Chrome versions                                   |




## 🧾 Example

If a website loads:

https://example.com/assets/css/main.scss
https://example.com/assets/fonts/Roboto.woff2
https://example.com/assets/images/banner/banner-thumb-01.png


You’ll get this folder structure:

```Downloads/
└── example.com/
    ├── index.html
    └── assets/
        ├── css/
        │   └── main.scss
        ├── fonts/
        │   └── Roboto.woff2
        └── images/
            └── banner/
                └── banner-thumb-01.png
```



### Need to fix this type of files 

```
<div data-background="src/image/filename.png"></div>
```