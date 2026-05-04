# From the Road & Studio

Retro CRT-style static site for Taka Nakai.

## Local Preview

Open `index.html` in a browser.

## Update Blog Archive

Fetch the latest Blogger feed and regenerate blog pages:

```sh
curl -L 'https://takanakai-sound.blogspot.com/feeds/posts/default?alt=json&max-results=100' -o blog-feed.json
node generate-blog.mjs
```

## GitHub Pages

This site is ready to publish from the repository root with GitHub Pages.
