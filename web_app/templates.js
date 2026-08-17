/**
 * TCT Feeds & Speeds Calculator - Adaptive Component Templates (Approach 2, Variant 4A)
 * Client-side Device Branching Templates for Static Hosting (GitHub Pages)
 */

window.AppTemplates = {
    /**
     * Renders Mobile-Optimized Card-Based Summary Deck (No horizontal table squeezing)
     */
    renderMobileSummary(data, unitSystem = 'imperial') {
        const el = document.createElement('div');
        el.className = 'adaptive-mobile-cards';
        el.setAttribute('data-component', 'mobile-summary-cards');

        if (!data || !data.rows || data.rows.length === 0) {
            el.innerHTML = `
                <div class="mobile-empty-card">
                    <p>Enter parameters above to view calculated machine specifications.</p>
                </div>
            `;
            return el;
        }

        const isMetric = (unitSystem === 'metric' || (data.unitSystem === 'metric'));

        let currentSection = "Setup Parameters";
        let sections = {};

        data.rows.forEach(item => {
            if (item.isDivider) {
                currentSection = item.title;
                sections[currentSection] = [];
            } else {
                if (!sections[currentSection]) sections[currentSection] = [];
                sections[currentSection].push(item);
            }
        });

        let html = '';
        for (const [sectionTitle, items] of Object.entries(sections)) {
            html += `
                <div class="adaptive-card-group">
                    <div class="adaptive-card-group-header">
                        <span class="group-dot"></span>
                        <h4>${sectionTitle}</h4>
                    </div>
                    <div class="adaptive-card-items">
            `;

            items.forEach(item => {
                const isHighlight = isMetric
                    ? (item.met.includes('m/min') || item.met.includes('krpm') || item.met.includes('SMM'))
                    : (item.imp.includes('IPM') || item.imp.includes('krpm') || item.imp.includes('SFM'));
                const primaryVal = isMetric ? item.met : item.imp;
                const secondaryVal = isMetric ? item.imp : item.met;

                html += `
                    <div class="adaptive-item-card ${isHighlight ? 'item-highlight' : ''}">
                        <div class="item-card-label">${item.param}</div>
                        <div class="item-card-values">
                            <div class="val-primary">${primaryVal}</div>
                            <div class="val-secondary">${secondaryVal}</div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        el.innerHTML = html;
        return el;
    },

    /**
     * Renders Mobile Bottom Fixed Navigation & Action Dock
     */
    renderMobileBottomDock(handlers) {
        const el = document.createElement('nav');
        el.className = 'adaptive-mobile-bottom-dock';
        el.setAttribute('data-component', 'mobile-bottom-dock');
        el.setAttribute('aria-label', 'Mobile Quick Actions');

        el.innerHTML = `
            <button type="button" class="mobile-dock-btn dock-btn-calc" id="mob-btn-calc" title="Recalculate">
                <span class="dock-icon">⚡</span>
                <span class="dock-label">Calculate</span>
            </button>
            <button type="button" class="mobile-dock-btn" id="mob-btn-copy" title="Copy Image to Clipboard">
                <span class="dock-icon">📷</span>
                <span class="dock-label">Copy Image</span>
            </button>
            <button type="button" class="mobile-dock-btn" id="mob-btn-export" title="Export CSV">
                <span class="dock-icon">📄</span>
                <span class="dock-label">Export CSV</span>
            </button>
            <button type="button" class="mobile-dock-btn" id="mob-btn-reset" title="Reset Inputs">
                <span class="dock-icon">🔄</span>
                <span class="dock-label">Reset</span>
            </button>
        `;

        // Wire handlers
        setTimeout(() => {
            const btnCalc = el.querySelector('#mob-btn-calc');
            const btnCopy = el.querySelector('#mob-btn-copy');
            const btnExport = el.querySelector('#mob-btn-export');
            const btnReset = el.querySelector('#mob-btn-reset');

            if (btnCalc && handlers.onCalc) btnCalc.addEventListener('click', handlers.onCalc);
            if (btnCopy && handlers.onCopy) btnCopy.addEventListener('click', handlers.onCopy);
            if (btnExport && handlers.onExport) btnExport.addEventListener('click', handlers.onExport);
            if (btnReset && handlers.onReset) btnReset.addEventListener('click', handlers.onReset);
        }, 0);

        return el;
    }
};
