/**
 * Post-build: inline ui.js into ui.html for Figma plugin compatibility.
 * Figma plugins require a self-contained HTML file with no external script refs.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dist/ui.html');
const jsPath   = path.join(__dirname, 'dist/ui.js');

let html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8')
  // Escape </script> so the HTML parser doesn't close the script block early
  .replace(/<\/script>/gi, '<\\/script>');

// Use a function replacement to prevent $ patterns in the JS bundle
// (e.g. $& $' $`) from being treated as special replacement sequences
html = html.replace(
  /<script\b[^>]*\bsrc="ui\.js"[^>]*>\s*<\/script>/i,
  () => `<script>${js}</script>`
);

fs.writeFileSync(htmlPath, html);
console.log('✓ Inlined ui.js into ui.html (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
