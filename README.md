# Pascal Mutaka Portfolio

Personal portfolio of Pascal Mutaka, full stack software engineer in Windhoek, Namibia.

**Live site:** https://pascalmtk.github.io/MyPortfolio/

Plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser to run it locally.

```
index.html          All page content
assets/css          Styles (paper theme, light and dark, 3D book)
assets/js           Book page turns, navigation, theme and the English/French switch (French text is in i18n.js)
assets/img          Portrait and project images
assets/video        Workflow animation
```

The content lives in a book: each `<div class="leaf">` in `index.html` holds a right-hand page (`.page.front`) and the next left-hand page (`.page.back`). A project uses two facing pages: the screenshot on the left, the details on the right. On phones and with reduced motion the pages stack instead of turning. Pushing to `gh-pages` publishes the site.
