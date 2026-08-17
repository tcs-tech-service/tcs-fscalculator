/**
 * Build Script: Bundles the entire web app into a single, self-contained HTML file
 * Inlines: CSS, JavaScript (sizes, templates, script), and Base64-encoded TCT Logo
 */

const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'web_app');
let html = fs.readFileSync(path.join(webAppDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(webAppDir, 'style.css'), 'utf8');
const sizesJs = fs.readFileSync(path.join(webAppDir, 'sizes.js'), 'utf8');
const templatesJs = fs.readFileSync(path.join(webAppDir, 'templates.js'), 'utf8');
const scriptJs = fs.readFileSync(path.join(webAppDir, 'script.js'), 'utf8');

// 1. Convert Logo to Base64 Data URL
const logoPath = path.join(webAppDir, '20150804 TCT logo.png');
let logoBase64 = '';
if (fs.existsSync(logoPath)) {
    const logoBuf = fs.readFileSync(logoPath);
    logoBase64 = 'data:image/png;base64,' + logoBuf.toString('base64');
    html = html.split('src="20150804 TCT logo.png"').join(`src="${logoBase64}"`);
}

// 2. Inline CSS (using replacer function to avoid $ pattern interpretation)
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);

// 3. Inline JavaScript Modules (using replacer function to avoid $ pattern interpretation)
const embeddedScripts = `
<script>
/* --- Embedded sizes.js --- */
${sizesJs}
</script>
<script>
/* --- Embedded templates.js --- */
${templatesJs}
</script>
<script>
/* --- Embedded script.js --- */
${scriptJs}
</script>
`;

html = html.replace(
    /<script src="sizes\.js"><\/script>\s*<script src="templates\.js"><\/script>\s*<script src="script\.js"><\/script>/,
    () => embeddedScripts
);

// 4. Save Standalone HTML in root and web_app folders
const rootOut = path.join(__dirname, 'TCT_Feeds_Speeds_Calculator_Standalone.html');
const webAppOut = path.join(webAppDir, 'TCT_Feeds_Speeds_Calculator_Standalone.html');

fs.writeFileSync(rootOut, html, 'utf8');
fs.writeFileSync(webAppOut, html, 'utf8');

const sizeKb = Math.round(fs.statSync(rootOut).size / 1024);
console.log(`✓ Standalone HTML successfully created at:\n  ${rootOut}\n  (${sizeKb} KB, 100% self-contained)`);
