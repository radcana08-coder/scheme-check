// build.js: makes the two shippable files from src/index.html.
//   dist/scheme-check.html           offline single file to send on WhatsApp
//   dist/scheme-check.artifact.html  the same page for web hosting (no html/head/body
//                                    wrapper, safe-area meta)
//   docs/index.html                  the public website (GitHub Pages), same as the offline file
// Bank logos: put official files in logos/<bank id>.svg|png|jpg|webp and they are embedded;
// banks without a file show their short letters instead.
// Run: node build.js
var fs = require('fs');
var path = require('path');

var FONTS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Gulzar&display=swap';
var MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function logosScript() {
  var dir = path.join(__dirname, 'logos'), logos = {};
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(function (file) {
      var ext = path.extname(file).toLowerCase();
      if (!MIME[ext]) return;
      logos[path.basename(file, ext)] = 'data:' + MIME[ext] + ';base64,' + fs.readFileSync(path.join(dir, file)).toString('base64');
    });
  }
  console.log('Logos embedded: ' + (Object.keys(logos).join(', ') || 'none'));
  return 'window.BANK_LOGOS = ' + JSON.stringify(logos) + ';\n';
}

// Public address and its QR code (made by tools/make-qr.py); the page hides the card without them.
function siteScript() {
  var cfg = path.join(__dirname, 'site.json'), qr = path.join(__dirname, 'assets', 'qr.svg');
  if (!fs.existsSync(cfg) || !fs.existsSync(qr)) { console.log('Public link: none'); return 'window.SITE = null;\n'; }
  var site = JSON.parse(fs.readFileSync(cfg, 'utf8'));
  console.log('Public link: ' + site.url);
  return 'window.SITE = ' + JSON.stringify({
    url: site.url, repo: site.repo || null, qr: 'data:image/svg+xml;base64,' + fs.readFileSync(qr).toString('base64')
  }) + ';\n';
}

var GENERATED = { 'logos.js': logosScript, 'site.js': siteScript };
var src = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');
var inlined = src.replace(/<script src="\.\.\/(\w+\.js)"><\/script>/g, function (_, file) {
  var code = GENERATED[file] ? GENERATED[file]() : fs.readFileSync(path.join(__dirname, file), 'utf8');
  if (code.indexOf('</script') !== -1) throw new Error(file + ' contains </script>');
  return '<script>\n' + code + '</script>';
});
if (/<script src=/.test(inlined)) throw new Error('A script was not inlined');

// Offline: load the web fonts without blocking, so the page still opens instantly with no internet.
var offline = inlined.replace('<!-- fonts -->',
  '<link rel="stylesheet" href="' + FONTS + '" media="print" onload="this.media=\'all\'">');

var hosted = inlined
  .replace('<!-- fonts -->',
    '<meta name="claude:viewport-fit-sides" content="cover">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="' + FONTS + '">')
  .replace(/^<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/g, '')
  .replace(/<\/?head>\s*/g, '')
  .replace(/<\/?body>\s*/g, '')
  .replace(/<meta charset="utf-8">\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '');
// The title must lead the file.
var title = hosted.match(/<title>[^<]*<\/title>\n?/)[0];
hosted = title + hosted.replace(title, '');
if (/<(body|head|html)[\s>]/i.test(hosted)) throw new Error('Wrapper tags left in hosted build');

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
[['scheme-check.html', offline], ['scheme-check.artifact.html', hosted]].forEach(function (pair) {
  var dest = path.join(__dirname, 'dist', pair[0]);
  fs.writeFileSync(dest, pair[1]);
  console.log('Wrote ' + dest + ' (' + Math.round(Buffer.byteLength(pair[1]) / 1024) + ' KB)');
});

// The public website: GitHub Pages serves docs/ (the offline file as the home page, plus the PDF).
var site = path.join(__dirname, 'docs');
fs.mkdirSync(site, { recursive: true });
fs.writeFileSync(path.join(site, 'index.html'), offline);
fs.writeFileSync(path.join(site, '.nojekyll'), '');
var pdf = path.join(__dirname, 'dist', 'Collapse-Model-Formula.pdf');
if (fs.existsSync(pdf)) fs.copyFileSync(pdf, path.join(site, 'Collapse-Model-Formula.pdf'));
console.log('Wrote ' + site + ' (website)');
