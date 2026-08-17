/**
 * TCT Feeds & Speeds Calculator - Enhanced Application Engine
 * Precision PCB & Micro-Machining Speeds & Feeds Logic
 */

// --- Responsive Device & Breakpoint Detection ---
const BREAKPOINTS = {
    mobile:  '(max-width: 767px)',
    tablet:  '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',
};

function detectDevice() {
    if (window.matchMedia(BREAKPOINTS.desktop).matches) return 'desktop';
    if (window.matchMedia(BREAKPOINTS.tablet).matches) return 'tablet';
    return 'mobile';
}

function applyDeviceDataset() {
    const device = detectDevice();
    document.documentElement.dataset.device = device;
    if (document.body) {
        document.body.dataset.touch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'true' : 'false';
    }
    return device;
}

// Initial run
let currentDevice = applyDeviceDataset();

// Re-check on breakpoint crossings only (not every pixel of resize)
Object.values(BREAKPOINTS).forEach((query) => {
    window.matchMedia(query).addEventListener('change', () => {
        const next = applyDeviceDataset();
        if (next !== currentDevice) {
            currentDevice = next;
            document.dispatchEvent(new CustomEvent('devicechange', { detail: { device: next } }));
        }
    });
});

// --- Data & State ---
let imperial_sizes = [];
let metric_sizes = [];

if (typeof sizesData !== 'undefined') {
    imperial_sizes = sizesData.imperial_sizes || [];
    metric_sizes = sizesData.metric_sizes || [];
}

const MATERIAL_PRESETS = {
    "FR4": { name: "FR4 (Standard PCB)", sfm: 400.0, fz_mil: 0.50 },
    "High Speed Digital": { name: "High Speed Digital (Megtron/Rogers)", sfm: 200.0, fz_mil: 0.50 },
    "Polyimide": { name: "Polyimide (Flex PCB / Rigid-Flex)", sfm: 200.0, fz_mil: 0.50 },
    "Teflon": { name: "Teflon (PTFE / RF High Frequency)", sfm: 200.0, fz_mil: 0.90 },
    "Custom": { name: "Custom / Manual Entry", sfm: 200.0, fz_mil: 0.50 }
};

let currentUnitSystem = localStorage.getItem('tct_unit_system') || 'imperial';
let currentWorkflowMode = localStorage.getItem('tct_workflow_mode') || 'compare-clean';
let undoCache = {
    rev: null,
    fwd: null
};

// --- Mathematical Engineering Engine ---
class MachiningMathEngine {
    static parseDiameter(diaStr) {
        if (!diaStr) return 0.0098;
        const cleanStr = diaStr.trim().split(" ")[0];
        if (cleanStr.includes('/')) {
            const [num, den] = cleanStr.split('/');
            const val = parseFloat(num) / parseFloat(den);
            return isNaN(val) ? 0.0098 : val;
        }
        const val = parseFloat(cleanStr);
        return isNaN(val) ? 0.0098 : val;
    }

    static calcForward(dia_in, rpm, ipm, flutes) {
        const sfm = (Math.PI * dia_in * rpm) / 12.0;
        const ipt = (rpm * flutes) > 0 ? ipm / (rpm * flutes) : 0.0;
        
        const area_in = (Math.PI * Math.pow(dia_in, 2)) / 4.0;
        const mrr_imp = area_in * ipm; // in³/min
        
        const dia_mm = dia_in * 25.4;
        const ipm_mm = ipm * 25.4;
        const area_mm = (Math.PI * Math.pow(dia_mm, 2)) / 4.0;
        const mrr_met = (area_mm * ipm_mm) / 1000.0; // cm³/min
        
        const vc_mmin = sfm * 0.3048;
        const fr_mmin = ipm * 0.0254;
        const fr_mms = ipm * 0.4233;
        const fz_mil = ipt * 1000.0;
        const fz_um = ipt * 25400.0;
        
        return {
            sfm,
            vc_mmin,
            ipt,
            fz_mil,
            fz_um,
            krpm: rpm / 1000.0,
            rpm,
            ipm,
            fr_mmin,
            fr_mms,
            mrr_imp,
            mrr_met,
            dia_in,
            dia_mm
        };
    }

    static calcReverse(dia_in, sfm_target, ipt_target, flutes, max_rpm = 0.0, min_rpm = 0.0) {
        const rpm_theoretical = dia_in > 0 ? (sfm_target * 12.0) / (Math.PI * dia_in) : 0.0;
        
        let capped = false;
        let cap_type = null;
        let rpm = rpm_theoretical;
        if (max_rpm > 0.0 && rpm > max_rpm) {
            rpm = max_rpm;
            capped = true;
            cap_type = 'max';
        } else if (min_rpm > 0.0 && rpm < min_rpm) {
            rpm = min_rpm;
            capped = true;
            cap_type = 'min';
        }
            
        const ipm = rpm * ipt_target * flutes;
        const sfm_achieved = (Math.PI * dia_in * rpm) / 12.0;
        
        const area_in = (Math.PI * Math.pow(dia_in, 2)) / 4.0;
        const mrr_imp = area_in * ipm;
        
        const dia_mm = dia_in * 25.4;
        const ipm_mm = ipm * 25.4;
        const area_mm = (Math.PI * Math.pow(dia_mm, 2)) / 4.0;
        const mrr_met = (area_mm * ipm_mm) / 1000.0;
        
        const vc_mmin = sfm_target * 0.3048;
        const vc_achieved_mmin = sfm_achieved * 0.3048;
        const fr_mmin = ipm * 0.0254;
        const fr_mms = ipm * 0.4233;
        const fz_mil = ipt_target * 1000.0;
        const fz_um = ipt_target * 25400.0;
        
        return {
            rpm,
            rpm_theoretical,
            krpm: rpm / 1000.0,
            krpm_theoretical: rpm_theoretical / 1000.0,
            ipm,
            fr_mmin,
            fr_mms,
            sfm_target,
            sfm_achieved,
            vc_mmin,
            vc_achieved_mmin,
            ipt_target,
            fz_mil,
            fz_um,
            mrr_imp,
            mrr_met,
            capped,
            cap_type,
            dia_in,
            dia_mm
        };
    }
}

// --- Searchable CSV Autocomplete Input Component (Specification: searchable_csv_input_pyside6.md) ---
class SearchableCsvInput {
    constructor({ inputEl, toggleEl, popupEl, listEl, getValuesFn, placeholder = "Type or select size...", maxResults = 100, onSelect, onInput }) {
        this.input = inputEl;
        this.toggle = toggleEl;
        this.popup = popupEl;
        this.list = listEl;
        this.getValues = getValuesFn;
        this.placeholder = placeholder;
        this.maxResults = maxResults;
        this.onSelect = onSelect || (() => {});
        this.onInput = onInput || (() => {});
        
        this.customValue = false;
        this.selectedIndex = -1;
        this.currentItems = [];

        this.init();
    }

    init() {
        if (this.placeholder) this.input.setAttribute('placeholder', this.placeholder);
        
        // Input typing listener
        this.input.addEventListener('input', () => {
            this.onTextChanged(this.input.value);
            this.onInput(this.input.value);
        });
        
        // Keydown navigation: Up, Down, Enter, Escape
        this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Focus handler
        this.input.addEventListener('focus', () => {
            this.input.select();
            if (this.input.value.trim()) {
                this.onTextChanged(this.input.value);
            }
        });

        // Toggle button click
        if (this.toggle) {
            this.toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isPopupVisible()) {
                    this.hidePopup();
                } else {
                    this.showAllOptions();
                    this.input.focus();
                }
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.popup.contains(e.target) && (!this.toggle || !this.toggle.contains(e.target))) {
                this.hidePopup();
            }
        });
    }

    getValuesList() {
        return typeof this.getValues === 'function' ? this.getValues() : (this.getValues || []);
    }

    onTextChanged(text) {
        text = text.trim();
        if (!text) {
            this.showAllOptions();
            return;
        }

        const search = text.toLowerCase();
        const allValues = this.getValuesList();
        
        // Substring matching across label & size
        const matches = allValues.filter(val => val.toLowerCase().includes(search)).slice(0, this.maxResults);

        this.renderItems(matches, text);
        this.showPopup();
    }

    showAllOptions() {
        const allValues = this.getValuesList().slice(0, this.maxResults);
        this.renderItems(allValues, "");
        this.showPopup();
    }

    renderItems(matches, searchText) {
        this.list.innerHTML = '';
        this.currentItems = [];
        this.selectedIndex = matches.length > 0 ? 0 : -1;

        if (matches.length > 0) {
            matches.forEach((val, idx) => {
                const li = document.createElement('li');
                li.className = 'searchable-item' + (idx === 0 ? ' active' : '') + (val === this.input.value.trim() ? ' selected' : '');
                li.setAttribute('role', 'option');
                li.dataset.index = idx;
                li.dataset.value = val;

                // Highlight matching substring
                if (searchText) {
                    const regex = new RegExp(`(${this.escapeRegex(searchText)})`, 'gi');
                    li.innerHTML = `<span>${val.replace(regex, '<mark class="match-hl">$1</mark>')}</span><span class="item-badge">Standard</span>`;
                } else {
                    li.innerHTML = `<span>${val}</span><span class="item-badge">Standard</span>`;
                }

                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.selectItem(val, false);
                });

                this.list.appendChild(li);
                this.currentItems.push({ value: val, isCustom: false, el: li });
            });
        }

        // Custom Option item if text is not in matches
        if (searchText && !matches.includes(searchText)) {
            const customLi = document.createElement('li');
            customLi.className = 'searchable-item custom-item' + (matches.length === 0 ? ' active' : '');
            customLi.setAttribute('role', 'option');
            customLi.dataset.custom = 'true';
            customLi.dataset.value = searchText;
            customLi.innerHTML = `<span>✨ Use "<strong>${searchText}</strong>" as custom value</span><span class="item-badge">Custom</span>`;
            
            customLi.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectItem(searchText, true);
            });

            this.list.appendChild(customLi);
            this.currentItems.push({ value: searchText, isCustom: true, el: customLi });
            if (matches.length === 0) this.selectedIndex = 0;
        }

        if (this.currentItems.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'searchable-empty';
            empty.textContent = 'No matching sizes found';
            this.list.appendChild(empty);
        }
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showPopup() {
        if (this.currentItems.length === 0) return;
        this.popup.style.display = 'block';
        if (this.toggle) this.toggle.classList.add('open');
        this.updateActiveItem();
    }

    hidePopup() {
        this.popup.style.display = 'none';
        if (this.toggle) this.toggle.classList.remove('open');
        this.checkValue();
    }

    isPopupVisible() {
        return this.popup.style.display !== 'none';
    }

    onKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!this.isPopupVisible()) {
                this.showAllOptions();
            } else if (this.currentItems.length > 0) {
                this.selectedIndex = (this.selectedIndex + 1) % this.currentItems.length;
                this.updateActiveItem();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.isPopupVisible() && this.currentItems.length > 0) {
                this.selectedIndex = (this.selectedIndex - 1 + this.currentItems.length) % this.currentItems.length;
                this.updateActiveItem();
            }
        } else if (e.key === 'Enter') {
            if (this.isPopupVisible() && this.selectedIndex >= 0 && this.selectedIndex < this.currentItems.length) {
                e.preventDefault();
                const selected = this.currentItems[this.selectedIndex];
                this.selectItem(selected.value, selected.isCustom);
            } else {
                this.checkValue();
                this.hidePopup();
                this.onSelect(this.input.value.trim(), this.customValue);
            }
        } else if (e.key === 'Escape') {
            this.hidePopup();
        } else if (e.key === 'Tab') {
            this.hidePopup();
        }
    }

    updateActiveItem() {
        this.currentItems.forEach((item, idx) => {
            if (idx === this.selectedIndex) {
                item.el.classList.add('active');
                item.el.scrollIntoView({ block: 'nearest' });
            } else {
                item.el.classList.remove('active');
            }
        });
    }

    selectItem(value, isCustom) {
        this.customValue = isCustom;
        this.input.value = value;
        this.hidePopup();
        this.onSelect(value, isCustom);
    }

    checkValue() {
        const val = this.input.value.trim();
        if (!val) {
            this.customValue = false;
            return;
        }
        const all = this.getValuesList();
        this.customValue = !all.includes(val);
    }

    value() {
        return this.input.value.trim();
    }

    is_custom() {
        this.checkValue();
        return this.customValue;
    }

    setValue(value, isCustom = null) {
        this.input.value = value;
        if (isCustom !== null) {
            this.customValue = isCustom;
        } else {
            this.checkValue();
        }
    }
}

// Global searchable input instances
let revDiaSearch = null;
let fwdDiaSearch = null;

// --- DOM Handles ---
const els = {
    // Recommend Panel (Reverse)
    rev: {
        panel: document.getElementById('panel-recommend'),
        materialRow: document.getElementById('row-rev-material'),
        dia: document.getElementById('rev-dia'),
        diaToggle: document.getElementById('rev-dia-toggle'),
        diaPopup: document.getElementById('rev-dia-popup'),
        diaList: document.getElementById('rev-dia-list'),
        diaUnit: document.getElementById('rev-dia-unit'),
        material: document.getElementById('rev-material'),
        vc: document.getElementById('rev-vc'),
        vcUnit: document.getElementById('rev-vc-unit'),
        fz: document.getElementById('rev-fz'),
        fzUnit: document.getElementById('rev-fz-unit'),
        flutes: document.getElementById('rev-flutes'),
        minRpm: document.getElementById('rev-min-rpm'),
        maxRpm: document.getElementById('rev-max-rpm'),
        advBadge: document.getElementById('rev-adv-badge'),
        cappingCallout: document.getElementById('callout-rev-capping'),
        cappingDesc: document.getElementById('capping-callout-desc'),
        cappingMetrics: document.getElementById('capping-metrics'),
        kpiKrpm: document.getElementById('kpi-rev-krpm'),
        kpiRpmSub: document.getElementById('kpi-rev-rpm-sub'),
        kpiFr: document.getElementById('kpi-rev-fr'),
        kpiFrSub: document.getElementById('kpi-rev-fr-sub'),
        kpiMrr: document.getElementById('kpi-rev-mrr'),
        kpiMrrSub: document.getElementById('kpi-rev-mrr-sub'),
        tableBody: document.querySelector('#table-rev tbody'),
        btnCalc: document.getElementById('btn-rev-calc'),
        btnCopy: document.getElementById('btn-rev-copy'),
        btnExport: document.getElementById('btn-rev-export'),
        btnReset: document.getElementById('btn-rev-reset')
    },
    // Verify Panel (Forward)
    fwd: {
        panel: document.getElementById('panel-verify'),
        dia: document.getElementById('fwd-dia'),
        diaToggle: document.getElementById('fwd-dia-toggle'),
        diaPopup: document.getElementById('fwd-dia-popup'),
        diaList: document.getElementById('fwd-dia-list'),
        diaUnit: document.getElementById('fwd-dia-unit'),
        fr: document.getElementById('fwd-fr'),
        frUnit: document.getElementById('fwd-fr-unit'),
        krpm: document.getElementById('fwd-krpm'),
        flutes: document.getElementById('fwd-flutes'),
        advBadge: document.getElementById('fwd-adv-badge'),
        kpiVc: document.getElementById('kpi-fwd-vc'),
        kpiVcSub: document.getElementById('kpi-fwd-vc-sub'),
        kpiFz: document.getElementById('kpi-fwd-fz'),
        kpiFzSub: document.getElementById('kpi-fwd-fz-sub'),
        kpiMrr: document.getElementById('kpi-fwd-mrr'),
        kpiMrrSub: document.getElementById('kpi-fwd-mrr-sub'),
        tableBody: document.querySelector('#table-fwd tbody'),
        btnCalc: document.getElementById('btn-fwd-calc'),
        btnCopy: document.getElementById('btn-fwd-copy'),
        btnExport: document.getElementById('btn-fwd-export'),
        btnReset: document.getElementById('btn-fwd-reset')
    },
    // Global Elements
    panelsWrapper: document.getElementById('panels-wrapper'),
    tabCompareClean: document.getElementById('tab-compare-clean'),
    tabCompareMaterial: document.getElementById('tab-compare-material'),
    tabRecommend: document.getElementById('tab-recommend'),
    tabVerify: document.getElementById('tab-verify'),
    btnImperial: document.getElementById('btn-unit-imperial'),
    btnMetric: document.getElementById('btn-unit-metric'),
    unitSliderCheckbox: document.getElementById('unit-slider-checkbox'),
    sliderOptImperial: document.getElementById('slider-opt-imperial') || document.getElementById('slider-opt-inches'),
    sliderOptMetric: document.getElementById('slider-opt-metric'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    themeText: document.getElementById('theme-text'),
    statusText: document.getElementById('status-text'),
    toastContainer: document.getElementById('toast-container'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    btnOpenShortcuts: document.getElementById('btn-open-shortcuts'),
    btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
    syncStatus: document.getElementById('sync-status')
};

// --- Initialization ---
function init() {
    // 0. Sync responsive device & touch datasets
    applyDeviceDataset();

    // 1. Initialize Theme from storage or system preference
    initTheme();

    // 2. Initialize Searchable CSV Autocomplete Inputs
    revDiaSearch = new SearchableCsvInput({
        inputEl: els.rev.dia,
        toggleEl: els.rev.diaToggle,
        popupEl: els.rev.diaPopup,
        listEl: els.rev.diaList,
        getValuesFn: () => (els.rev.diaUnit.value === 'mm' ? metric_sizes : imperial_sizes),
        placeholder: "Type or select size...",
        onSelect: (val, isCustom) => {
            if (fwdDiaSearch && fwdDiaSearch.value() !== val) {
                fwdDiaSearch.setValue(val, isCustom);
                triggerSyncBadge();
            }
            calculateAll(true);
        },
        onInput: (val) => {
            if (fwdDiaSearch && fwdDiaSearch.value() !== val) {
                fwdDiaSearch.setValue(val);
            }
            calculateAll(true);
        }
    });

    if (els.fwd.dia) {
        fwdDiaSearch = new SearchableCsvInput({
            inputEl: els.fwd.dia,
            toggleEl: els.fwd.diaToggle,
            popupEl: els.fwd.diaPopup,
            listEl: els.fwd.diaList,
            getValuesFn: () => (els.fwd.diaUnit.value === 'mm' ? metric_sizes : imperial_sizes),
            placeholder: "Type or select size...",
            onSelect: (val, isCustom) => {
                if (revDiaSearch && revDiaSearch.value() !== val) {
                    revDiaSearch.setValue(val, isCustom);
                    triggerSyncBadge();
                }
                calculateAll(true);
            },
            onInput: (val) => {
                if (revDiaSearch && revDiaSearch.value() !== val) {
                    revDiaSearch.setValue(val);
                }
                calculateAll(true);
            }
        });
    }

    // 3. Set Initial Defaults based on loaded unit preference
    const isMetric = currentUnitSystem === 'metric';
    const initialDia = isMetric ? "0.2489 (0.25mm / 0.0098in)" : "0.0098 (0.25mm)";
    revDiaSearch.setValue(initialDia, false);
    if (fwdDiaSearch) fwdDiaSearch.setValue(initialDia, false);

    // 4. Setup Global Unit System
    applyGlobalUnitSystem(currentUnitSystem, false);

    // 5. Setup Workflow Mode
    if (els.panelsWrapper && els.panelsWrapper.classList.contains('compare-mode')) {
        setWorkflowMode(currentWorkflowMode, false);
    }

    // 6. Bind Event Listeners
    setupEventListeners();

    // 7. Initial Calculations
    calculateAll(true);
}

// --- Diameter Conversion Helper ---
function convertSearchableDiameter(searchInstance, fromUnit, toUnit) {
    if (!searchInstance) return;
    const val = searchInstance.value();
    if (!val) return;

    const fromList = fromUnit === 'mm' ? metric_sizes : imperial_sizes;
    const toList = toUnit === 'mm' ? metric_sizes : imperial_sizes;

    const idx = fromList.indexOf(val);
    if (idx !== -1 && idx < toList.length) {
        searchInstance.setValue(toList[idx], false);
    } else {
        const parsed = MachiningMathEngine.parseDiameter(val);
        if (!isNaN(parsed) && parsed > 0) {
            const converted = toUnit === 'mm' ? (parsed * 25.4).toFixed(4) : (parsed / 25.4).toFixed(4);
            searchInstance.setValue(converted, true);
        }
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Cyclic 5-Tab-Stop Sequence Focus Handler
    const tabStopElements = [
        els.rev.dia,   // Stop 1: Tool Diameter
        els.rev.fz,    // Stop 2: Chipload
        els.rev.vc,    // Stop 3: Cutting Speed
        els.fwd.fr,    // Stop 4: Feed Rate
        els.fwd.krpm   // Stop 5: Spindle Speed
    ];

    // Select-all-on-focus for all numerical inputs
    const selectOnFocus = (e) => {
        if (e.target && typeof e.target.select === 'function') {
            setTimeout(() => e.target.select(), 10);
        }
    };

    [els.rev.fz, els.rev.vc, els.rev.flutes, els.rev.maxRpm,
     els.fwd.fr, els.fwd.krpm, els.fwd.flutes].forEach(input => {
        if (input) {
            input.addEventListener('focus', selectOnFocus);
        }
    });

    // Tool Diameter Unit Listeners
    if (els.rev.diaUnit) {
        els.rev.diaUnit.addEventListener('change', () => {
            const toUnit = els.rev.diaUnit.value;
            const system = toUnit === 'mm' ? 'metric' : 'imperial';
            applyGlobalUnitSystem(system, true);
        });
    }

    if (els.fwd.diaUnit) {
        els.fwd.diaUnit.addEventListener('change', () => {
            const toUnit = els.fwd.diaUnit.value;
            const system = toUnit === 'mm' ? 'metric' : 'imperial';
            applyGlobalUnitSystem(system, true);
        });
    }

    // Recommend Panel Listeners
    if (els.rev.material) els.rev.material.addEventListener('change', onMaterialSelect);
    if (els.rev.vc) els.rev.vc.addEventListener('input', () => calculateReverse(true, true));
    if (els.rev.vcUnit) els.rev.vcUnit.addEventListener('change', () => calculateReverse(true, true));
    if (els.rev.fz) els.rev.fz.addEventListener('input', () => calculateReverse(true, true));
    if (els.rev.fzUnit) els.rev.fzUnit.addEventListener('change', () => calculateReverse(true, true));
    if (els.rev.flutes) els.rev.flutes.addEventListener('input', () => { updateAdvancedBadge('rev'); calculateReverse(true, true); });
    if (els.rev.minRpm) els.rev.minRpm.addEventListener('input', () => calculateReverse(true, true));
    if (els.rev.maxRpm) els.rev.maxRpm.addEventListener('input', () => calculateReverse(true, true));

    if (els.rev.btnCalc) els.rev.btnCalc.addEventListener('click', () => calculateReverse(false, true));
    if (els.rev.btnCopy) els.rev.btnCopy.addEventListener('click', () => copyTableToClipboard('rev'));
    if (els.rev.btnExport) els.rev.btnExport.addEventListener('click', () => exportTableCSV('rev'));
    if (els.rev.btnReset) els.rev.btnReset.addEventListener('click', () => resetPanelWithUndo('rev'));

    // Verify Panel Listeners (Integrated in Left Panel)
    if (els.fwd.fr) els.fwd.fr.addEventListener('input', () => calculateForward(true, true));
    if (els.fwd.frUnit) els.fwd.frUnit.addEventListener('change', () => calculateForward(true, true));
    if (els.fwd.krpm) els.fwd.krpm.addEventListener('input', () => calculateForward(true, true));
    if (els.fwd.flutes) els.fwd.flutes.addEventListener('input', () => { updateAdvancedBadge('fwd'); calculateForward(true, true); });

    if (els.fwd.btnCalc) els.fwd.btnCalc.addEventListener('click', () => calculateForward(false, true));
    if (els.fwd.btnCopy) els.fwd.btnCopy.addEventListener('click', () => copyTableToClipboard('fwd'));
    if (els.fwd.btnExport) els.fwd.btnExport.addEventListener('click', () => exportTableCSV('fwd'));
    if (els.fwd.btnReset) els.fwd.btnReset.addEventListener('click', () => resetPanelWithUndo('fwd'));

    // Workflow Mode Tabs
    if (els.tabCompareClean) els.tabCompareClean.addEventListener('click', () => setWorkflowMode('compare-clean'));
    if (els.tabCompareMaterial) els.tabCompareMaterial.addEventListener('click', () => setWorkflowMode('compare-material'));
    if (els.tabRecommend) els.tabRecommend.addEventListener('click', () => setWorkflowMode('recommend'));
    if (els.tabVerify) els.tabVerify.addEventListener('click', () => setWorkflowMode('verify'));

    // Global Unit Switches (Slider & Buttons)
    if (els.unitSliderCheckbox) {
        els.unitSliderCheckbox.addEventListener('change', () => {
            const system = els.unitSliderCheckbox.checked ? 'metric' : 'imperial';
            applyGlobalUnitSystem(system, true);
        });
    }
    if (els.sliderOptImperial) {
        els.sliderOptImperial.addEventListener('click', (e) => {
            e.preventDefault();
            applyGlobalUnitSystem('imperial', true);
        });
    }
    if (els.sliderOptMetric) {
        els.sliderOptMetric.addEventListener('click', (e) => {
            e.preventDefault();
            applyGlobalUnitSystem('metric', true);
        });
    }
    if (els.btnImperial) els.btnImperial.addEventListener('click', () => applyGlobalUnitSystem('imperial'));
    if (els.btnMetric) els.btnMetric.addEventListener('click', () => applyGlobalUnitSystem('metric'));

    // Theme Toggle
    els.themeToggle.addEventListener('click', toggleTheme);

    // Shortcuts Modal
    els.btnOpenShortcuts.addEventListener('click', () => openShortcutsModal(true));
    els.btnCloseShortcuts.addEventListener('click', () => openShortcutsModal(false));
    els.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === els.shortcutsModal) openShortcutsModal(false);
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);

    // 5-Tab-Stop Navigation Loop:
    // 1. Tool Diameter -> 2. Chipload -> 3. Cutting Speed -> 4. Feed Rate -> 5. Spindle Speed -> loops to 1
    els.fwd.krpm.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            els.rev.dia.focus();
            els.rev.dia.select();
        }
    });

    els.rev.dia.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            els.fwd.krpm.focus();
            els.fwd.krpm.select();
        }
    });
}

// --- Population of Dropdowns ---
function populateDropdowns(panel) {
    // Searchable input uses dynamic getValuesFn so no manual option rebuild needed
}

// --- Material Preset Selector ---
function onMaterialSelect() {
    const key = els.rev.material.value;
    const preset = MATERIAL_PRESETS[key];
    if (!preset || key === 'Custom') return;

    let targetSfm = preset.sfm;
    let targetFzMil = preset.fz_mil;

    // Convert values according to active unit selections
    if (els.rev.vcUnit.value === 'm/min') {
        targetSfm = targetSfm * 0.3048;
    }
    
    if (els.rev.fzUnit.value === 'micron/rev' || els.rev.fzUnit.value === 'mm/tooth') {
        targetFzMil = (targetFzMil * 0.001) * 25400.0;
    }

    els.rev.vc.value = targetSfm.toFixed(1);
    els.rev.fz.value = targetFzMil.toFixed(2);

    showToast(`Loaded workpiece material preset: ${preset.name}`);
    calculateReverse(true, true);
}

// --- Advanced Badges ---
function updateAdvancedBadge(panel) {
    if (panel === 'rev') {
        if (!els.rev.flutes || !els.rev.maxRpm || !els.rev.advBadge) return;
        const flutes = parseInt(els.rev.flutes.value) || 1;
        const maxRpm = parseFloat(els.rev.maxRpm.value) || 0;
        if (flutes !== 1 || maxRpm !== 200.0) {
            els.rev.advBadge.textContent = 'Customized';
            els.rev.advBadge.className = 'badge-tag badge-warning';
        } else {
            els.rev.advBadge.textContent = 'Standard';
            els.rev.advBadge.className = 'badge-tag badge-info';
        }
    } else {
        if (!els.fwd.flutes || !els.fwd.advBadge) return;
        const flutes = parseInt(els.fwd.flutes.value) || 1;
        if (flutes !== 1) {
            els.fwd.advBadge.textContent = 'Customized';
            els.fwd.advBadge.className = 'badge-tag badge-warning';
        } else {
            els.fwd.advBadge.textContent = 'Standard';
            els.fwd.advBadge.className = 'badge-tag badge-info';
        }
    }
}

function triggerSyncBadge() {
    if (!els.syncStatus) return;
    els.syncStatus.style.transform = 'scale(1.08)';
    setTimeout(() => {
        if (els.syncStatus) els.syncStatus.style.transform = 'scale(1)';
    }, 250);
}

// --- Global Unit System ---
function applyGlobalUnitSystem(system, recalculate = true) {
    const oldUnit = currentUnitSystem === 'metric' ? 'mm' : 'in';
    const newUnit = system === 'metric' ? 'mm' : 'in';

    currentUnitSystem = system;
    localStorage.setItem('tct_unit_system', system);

    const isMetric = system === 'metric';

    if (els.unitSliderCheckbox) {
        els.unitSliderCheckbox.checked = isMetric;
    }
    if (els.sliderOptImperial && els.sliderOptMetric) {
        els.sliderOptImperial.classList.toggle('active', !isMetric);
        els.sliderOptMetric.classList.toggle('active', isMetric);
    }
    if (els.btnMetric && els.btnImperial) {
        els.btnMetric.classList.toggle('active', isMetric);
        els.btnMetric.setAttribute('aria-pressed', isMetric ? 'true' : 'false');
        els.btnImperial.classList.toggle('active', !isMetric);
        els.btnImperial.setAttribute('aria-pressed', !isMetric ? 'true' : 'false');
    }

    if (isMetric) {
        // Convert numerical input values if switching from imperial to metric
        if (oldUnit === 'in') {
            const curFz = parseFloat(els.rev.fz.value);
            if (!isNaN(curFz) && curFz > 0) {
                els.rev.fz.value = (curFz * 25.4).toFixed(1);
            }
            const curVc = parseFloat(els.rev.vc.value);
            if (!isNaN(curVc) && curVc > 0) {
                els.rev.vc.value = (curVc * 0.3048).toFixed(1);
            }
            const curFr = parseFloat(els.fwd.fr.value);
            if (!isNaN(curFr) && curFr > 0) {
                els.fwd.fr.value = ((curFr * 25.4) / 1000.0).toFixed(2);
            }
        }

        // Update ALL selection units in form controls to Metric
        if (els.rev.diaUnit) els.rev.diaUnit.value = 'mm';
        if (els.rev.fzUnit) els.rev.fzUnit.value = 'micron/rev';
        if (els.rev.vcUnit) els.rev.vcUnit.value = 'm/min';
        
        if (els.fwd.diaUnit) els.fwd.diaUnit.value = 'mm';
        if (els.fwd.frUnit) els.fwd.frUnit.value = 'm/min';
    } else {
        // Convert numerical input values if switching from metric to imperial
        if (oldUnit === 'mm') {
            const curFz = parseFloat(els.rev.fz.value);
            if (!isNaN(curFz) && curFz > 0) {
                els.rev.fz.value = (curFz / 25.4).toFixed(2);
            }
            const curVc = parseFloat(els.rev.vc.value);
            if (!isNaN(curVc) && curVc > 0) {
                els.rev.vc.value = (curVc / 0.3048).toFixed(1);
            }
            const curFr = parseFloat(els.fwd.fr.value);
            if (!isNaN(curFr) && curFr > 0) {
                els.fwd.fr.value = ((curFr * 1000.0) / 25.4).toFixed(1);
            }
        }

        // Update ALL selection units in form controls to Imperial
        if (els.rev.diaUnit) els.rev.diaUnit.value = 'in';
        if (els.rev.fzUnit) els.rev.fzUnit.value = '0.001 in/rev';
        if (els.rev.vcUnit) els.rev.vcUnit.value = 'SFM';
        
        if (els.fwd.diaUnit) els.fwd.diaUnit.value = 'in';
        if (els.fwd.frUnit) els.fwd.frUnit.value = 'IPM';
    }

    if (oldUnit !== newUnit) {
        if (revDiaSearch) convertSearchableDiameter(revDiaSearch, oldUnit, newUnit);
        if (fwdDiaSearch) convertSearchableDiameter(fwdDiaSearch, oldUnit, newUnit);
        triggerSyncBadge();
    }

    if (recalculate) {
        calculateAll(true);
        showToast(`Switched units to ${system.toUpperCase()} (${isMetric ? 'mm, µm/rev, m/min' : 'in, mil, SFM'})`);
    }
}

// --- Workflow Mode Tabs ---
function setWorkflowMode(mode, notify = true) {
    currentWorkflowMode = mode;
    localStorage.setItem('tct_workflow_mode', mode);

    [els.tabCompareClean, els.tabCompareMaterial, els.tabRecommend, els.tabVerify].forEach(t => {
        if (t) {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        }
    });

    if (mode === 'compare-clean' || mode === 'compare') {
        if (els.tabCompareClean) {
            els.tabCompareClean.classList.add('active');
            els.tabCompareClean.setAttribute('aria-selected', 'true');
        }
        if (els.panelsWrapper) els.panelsWrapper.classList.add('compare-mode', 'compare-clean-mode');
        if (els.rev.panel) els.rev.panel.classList.remove('panel-hidden');
        if (els.fwd.panel) els.fwd.panel.classList.remove('panel-hidden');
        if (els.rev.materialRow) els.rev.materialRow.style.display = 'none';
        if (notify) showToast("Switched to: Side-by-Side (Direct / No Material)");
    } else if (mode === 'compare-material') {
        if (els.tabCompareMaterial) {
            els.tabCompareMaterial.classList.add('active');
            els.tabCompareMaterial.setAttribute('aria-selected', 'true');
        }
        if (els.panelsWrapper) {
            els.panelsWrapper.classList.add('compare-mode');
            els.panelsWrapper.classList.remove('compare-clean-mode');
        }
        if (els.rev.panel) els.rev.panel.classList.remove('panel-hidden');
        if (els.fwd.panel) els.fwd.panel.classList.remove('panel-hidden');
        if (els.rev.materialRow) els.rev.materialRow.style.display = 'flex';
        if (notify) showToast("Switched to: Side-by-Side (With Material Presets)");
    } else if (mode === 'recommend') {
        if (els.tabRecommend) {
            els.tabRecommend.classList.add('active');
            els.tabRecommend.setAttribute('aria-selected', 'true');
        }
        if (els.panelsWrapper) els.panelsWrapper.classList.remove('compare-mode', 'compare-clean-mode');
        if (els.rev.panel) els.rev.panel.classList.remove('panel-hidden');
        if (els.fwd.panel) els.fwd.panel.classList.add('panel-hidden');
        if (els.rev.materialRow) els.rev.materialRow.style.display = 'flex';
        if (notify) showToast("Switched to: Recommend CNC Inputs");
    } else if (mode === 'verify') {
        if (els.tabVerify) {
            els.tabVerify.classList.add('active');
            els.tabVerify.setAttribute('aria-selected', 'true');
        }
        if (els.panelsWrapper) els.panelsWrapper.classList.remove('compare-mode', 'compare-clean-mode');
        if (els.rev.panel) els.rev.panel.classList.add('panel-hidden');
        if (els.fwd.panel) els.fwd.panel.classList.remove('panel-hidden');
        if (notify) showToast("Switched to: Verify Tool Engagement");
    }
}

// --- Calculations ---
function calculateAll(silent = true) {
    calculateReverse(silent, true);
}

function calculateReverse(silent = true, syncToForward = true) {
    try {
        const diaStr = revDiaSearch ? revDiaSearch.value() : els.rev.dia.value;
        const raw_dia = MachiningMathEngine.parseDiameter(diaStr);
        const raw_vc = parseFloat(els.rev.vc.value);
        const raw_fz = parseFloat(els.rev.fz.value);
        const flutes = els.rev.flutes ? (parseInt(els.rev.flutes.value) || 1) : 1;
        const min_rpm_str = els.rev.minRpm ? els.rev.minRpm.value : "20.0";
        const min_rpm = min_rpm_str ? parseFloat(min_rpm_str) * 1000.0 : 0.0;
        const max_rpm_str = els.rev.maxRpm ? els.rev.maxRpm.value : "200.0";
        const max_rpm = max_rpm_str ? parseFloat(max_rpm_str) * 1000.0 : 0.0;

        if (isNaN(raw_dia) || isNaN(raw_vc) || isNaN(raw_fz) || isNaN(flutes) || isNaN(max_rpm) || isNaN(min_rpm) ||
            raw_dia <= 0 || raw_vc <= 0 || raw_fz <= 0 || flutes <= 0 || max_rpm < 0 || min_rpm < 0) {
            throw new Error("Invalid Input Parameters");
        }

        let base_dia_in = els.rev.diaUnit.value === "mm" ? raw_dia / 25.4 : raw_dia;
        let base_sfm = els.rev.vcUnit.value === "m/min" ? raw_vc / 0.3048 : raw_vc;
        let base_ipt = raw_fz;
        
        if (els.rev.fzUnit.value === 'mm/tooth' || els.rev.fzUnit.value === 'mm/t') {
            base_ipt = raw_fz / 25.4;
        } else if (els.rev.fzUnit.value === 'micron/rev' || els.rev.fzUnit.value === 'micron per revolution') {
            base_ipt = raw_fz / 25400.0;
        } else if (els.rev.fzUnit.value === '0.001 in/rev' || els.rev.fzUnit.value === '0.001" per revolution') {
            base_ipt = raw_fz / 1000.0;
        }

        const res = MachiningMathEngine.calcReverse(base_dia_in, base_sfm, base_ipt, flutes, max_rpm, min_rpm);

        // Update KPI Cards
        els.rev.kpiKrpm.textContent = res.krpm.toFixed(1);
        els.rev.kpiRpmSub.textContent = `${Math.round(res.rpm).toLocaleString()} RPM${res.capped ? (res.cap_type === 'min' ? ' [MIN LIMIT]' : ' [MAX CAPPED]') : ''}`;
        
        els.rev.kpiFr.textContent = res.ipm.toFixed(1);
        els.rev.kpiFrSub.textContent = `${res.fr_mmin.toFixed(2)} m/min (${res.fr_mms.toFixed(1)} mm/s)`;
        
        els.rev.kpiMrr.textContent = res.mrr_imp.toFixed(4);
        els.rev.kpiMrrSub.textContent = `${res.mrr_met.toFixed(3)} cm³/min`;

        // Update Spindle Safeguard Status Pill & Callout
        const safeguardDot = document.getElementById('safeguard-dot');
        const safeguardText = document.getElementById('safeguard-status-text');

        if (res.cap_type === 'min') {
            if (safeguardDot) safeguardDot.className = 'safeguard-dot capped';
            if (safeguardText) safeguardText.textContent = `Boosted to Min Limit (${min_rpm_str} krpm)`;
        } else if (res.cap_type === 'max') {
            if (safeguardDot) safeguardDot.className = 'safeguard-dot capped';
            if (safeguardText) safeguardText.textContent = `Throttled at Max Limit (${max_rpm_str} krpm)`;
        } else if (min_rpm <= 0 && max_rpm <= 0) {
            if (safeguardDot) safeguardDot.className = 'safeguard-dot unlimited';
            if (safeguardText) safeguardText.textContent = 'Unlimited (No Limits Configured)';
        } else {
            if (safeguardDot) safeguardDot.className = 'safeguard-dot active';
            const rangeText = min_rpm > 0 && max_rpm > 0 ? `${min_rpm_str} – ${max_rpm_str} krpm` : (max_rpm > 0 ? `Max: ${max_rpm_str} krpm` : `Min: ${min_rpm_str} krpm`);
            if (safeguardText) safeguardText.textContent = `Spindle Limits Active (${rangeText})`;
        }

        if (res.capped) {
            if (els.rev.cappingCallout) {
                els.rev.cappingCallout.classList.remove('hidden');
                const limitName = res.cap_type === 'min' ? `minimum threshold (${min_rpm_str} krpm)` : `maximum limit (${max_rpm_str} krpm)`;
                if (els.rev.cappingDesc) els.rev.cappingDesc.textContent = `Machine spindle speed ${limitName} enforced. Feed rate has been scaled automatically to preserve target chipload (${res.fz_mil.toFixed(2)} mil / ${res.fz_um.toFixed(1)} µm).`;
                
                if (els.rev.cappingMetrics) {
                    els.rev.cappingMetrics.innerHTML = `
                        <div class="capping-metric-tile">
                            <span class="cap-tile-label">Req. Spindle Speed:</span>
                            <span class="cap-tile-val">${res.krpm_theoretical.toFixed(1)} krpm</span>
                        </div>
                        <div class="capping-metric-tile">
                            <span class="cap-tile-label">${res.cap_type === 'min' ? 'Enforced Min Speed:' : 'Capped Max Speed:'}</span>
                            <span class="cap-tile-val">${res.krpm.toFixed(1)} krpm</span>
                        </div>
                        <div class="capping-metric-tile">
                            <span class="cap-tile-label">Achieved Cutting Speed:</span>
                            <span class="cap-tile-val">${res.sfm_achieved.toFixed(0)} SFM (${res.vc_achieved_mmin.toFixed(0)} m/min)</span>
                        </div>
                    `;
                }
            }
        } else {
            if (els.rev.cappingCallout) els.rev.cappingCallout.classList.add('hidden');
        }

        // Populate Table
        const tbody = els.rev.tableBody;
        tbody.innerHTML = '';

        const addRow = (param, imp, met, isDivider = false) => {
            const tr = document.createElement('tr');
            if (isDivider) {
                tr.className = 'divider-row';
                tr.innerHTML = `<td colspan="3">${param}</td>`;
            } else {
                tr.innerHTML = `<td>${param}</td><td>${imp}</td><td>${met}</td>`;
            }
            tbody.appendChild(tr);
        };

        addRow("Tool Diameter (D)", `${res.dia_in.toFixed(4)} in`, `${res.dia_mm.toFixed(3)} mm`);
        addRow("Chipload (fz / IPT)", `${res.fz_mil.toFixed(2)} mil/rev (${res.ipt_target.toFixed(5)} in)`, `${res.fz_um.toFixed(1)} µm/rev`);
        addRow("Target Cutting Speed (Vc)", `${res.sfm_target.toFixed(0)} SFM`, `${res.vc_mmin.toFixed(1)} m/min`);
        if (res.capped) {
            const statusTag = res.cap_type === 'min' ? '[Boosted to Min]' : '[Throttled at Max]';
            addRow("Achieved Cutting Speed (Vc)", `${res.sfm_achieved.toFixed(0)} SFM ${statusTag}`, `${res.vc_achieved_mmin.toFixed(1)} m/min`);
        }
        
        addRow("Calculated Machine Parameters", "", "", true);
        addRow("Linear Feed Rate (F)", `${res.ipm.toFixed(1)} IPM`, `${res.fr_mmin.toFixed(3)} m/min | ${res.fr_mms.toFixed(2)} mm/s`);
        addRow("Spindle Speed (N)", `${res.krpm.toFixed(1)} krpm (${Math.round(res.rpm).toLocaleString()} RPM)${res.capped ? (res.cap_type === 'min' ? ' [MIN LIMIT]' : ' [MAX CAPPED]') : ''}`, `${res.krpm.toFixed(1)} krpm`);
        addRow("Drilling MRR", `${res.mrr_imp.toFixed(4)} in³/min`, `${res.mrr_met.toFixed(3)} cm³/min`);

        // Sync machine outputs to Verify Panel inputs (Spindle Speed & Feed Rate)
        if (syncToForward) {
            els.fwd.krpm.value = res.krpm.toFixed(1);
            if (els.fwd.frUnit.value === 'm/min') {
                els.fwd.fr.value = res.fr_mmin.toFixed(2);
            } else if (els.fwd.frUnit.value === 'mm/sec') {
                els.fwd.fr.value = res.fr_mms.toFixed(1);
            } else {
                els.fwd.fr.value = res.ipm.toFixed(1);
            }
            if (els.fwd.flutes) {
                els.fwd.flutes.value = flutes.toString();
            }
            calculateForward(true, false);
            triggerSyncBadge();
        }

        setStatus("Recommended machine speeds & feeds updated.");
        if (!silent) showToast("Calculated machine speeds & feeds successfully.");
    } catch (e) {
        if (!silent) showToast("Invalid parameter entered. Please check values.", "warning");
        setStatus("Error: Invalid reverse parameters.");
    }
}

function calculateForward(silent = true, syncToReverse = false) {
    try {
        const diaStr = revDiaSearch ? revDiaSearch.value() : (fwdDiaSearch ? fwdDiaSearch.value() : els.rev.dia.value);
        const raw_dia = MachiningMathEngine.parseDiameter(diaStr);
        const krpm = parseFloat(els.fwd.krpm.value);
        const raw_fr = parseFloat(els.fwd.fr.value);
        const flutes = els.rev.flutes ? (parseInt(els.rev.flutes.value) || 1) : 1;
        const rpm = krpm * 1000.0;

        if (isNaN(rpm) || isNaN(flutes) || isNaN(raw_dia) || isNaN(raw_fr) ||
            rpm <= 0 || flutes <= 0 || raw_dia <= 0 || raw_fr <= 0) {
            throw new Error("Invalid Input Parameters");
        }

        const isDiaMm = (els.rev.diaUnit ? els.rev.diaUnit.value : 'in') === "mm";
        let base_dia_in = isDiaMm ? raw_dia / 25.4 : raw_dia;
        let base_ipm = raw_fr;
        if (els.fwd.frUnit.value === "m/min") base_ipm = (raw_fr * 1000.0) / 25.4;
        else if (els.fwd.frUnit.value === "mm/sec") base_ipm = (raw_fr * 60.0) / 25.4;

        const res = MachiningMathEngine.calcForward(base_dia_in, rpm, base_ipm, flutes);

        // Update KPI Cards
        els.fwd.kpiVc.textContent = Math.round(res.sfm).toString();
        els.fwd.kpiVcSub.textContent = `${Math.round(res.vc_mmin)} m/min`;
        
        els.fwd.kpiFz.textContent = res.fz_mil.toFixed(2);
        els.fwd.kpiFzSub.textContent = `${res.fz_um.toFixed(1)} µm/rev (${res.ipt.toFixed(5)} in)`;
        
        els.fwd.kpiMrr.textContent = res.mrr_imp.toFixed(4);
        els.fwd.kpiMrrSub.textContent = `${res.mrr_met.toFixed(3)} cm³/min`;

        // Populate Table if present
        const tbody = els.fwd.tableBody;
        if (tbody) {
            tbody.innerHTML = '';

            const addRow = (param, imp, met, isDivider = false) => {
                const tr = document.createElement('tr');
                if (isDivider) {
                    tr.className = 'divider-row';
                    tr.innerHTML = `<td colspan="3">${param}</td>`;
                } else {
                    tr.innerHTML = `<td>${param}</td><td>${imp}</td><td>${met}</td>`;
                }
                tbody.appendChild(tr);
            };

            addRow("Tool Diameter (D)", `${res.dia_in.toFixed(4)} in`, `${res.dia_mm.toFixed(3)} mm`);
            addRow("Linear Feed Rate (F)", `${res.ipm.toFixed(1)} IPM`, `${res.fr_mmin.toFixed(3)} m/min | ${res.fr_mms.toFixed(2)} mm/s`);
            addRow("Spindle Speed (N)", `${res.krpm.toFixed(1)} krpm (${Math.round(res.rpm).toLocaleString()} RPM)`, `${res.krpm.toFixed(1)} krpm`);
            
            addRow("Calculated Tool Engagement", "", "", true);
            addRow("Chipload (fz / IPT)", `${res.fz_mil.toFixed(2)} mil/rev (${res.ipt.toFixed(5)} in)`, `${res.fz_um.toFixed(1)} µm/rev`);
            addRow("Cutting Speed (Vc)", `${Math.round(res.sfm)} SFM`, `${Math.round(res.vc_mmin)} m/min`);
            addRow("Drilling MRR", `${res.mrr_imp.toFixed(4)} in³/min`, `${res.mrr_met.toFixed(3)} cm³/min`);
        }

        // Sync cutting speed and chipload back to Recommend Panel (Left panel)
        if (syncToReverse) {
            if (els.rev.vcUnit.value === 'm/min') {
                els.rev.vc.value = res.vc_mmin.toFixed(1);
            } else {
                els.rev.vc.value = res.sfm.toFixed(1);
            }

            if (els.rev.fzUnit.value === 'micron/rev') {
                els.rev.fz.value = res.fz_um.toFixed(1);
            } else if (els.rev.fzUnit.value === 'mm/tooth' || els.rev.fzUnit.value === 'mm/t') {
                els.rev.fz.value = (res.ipt * 25.4).toFixed(4);
            } else {
                els.rev.fz.value = res.fz_mil.toFixed(2);
            }

            if (els.rev.flutes) {
                els.rev.flutes.value = flutes.toString();
            }

            if (els.rev.material) {
                els.rev.material.value = 'Custom';
            }

            calculateReverse(true, false);
            triggerSyncBadge();
        }

        setStatus("Tool engagement parameters verified successfully.");
        if (!silent) showToast("Verified tool engagement parameters.");
    } catch (e) {
        if (!silent) showToast("Invalid forward parameter entered.", "warning");
        setStatus("Error: Invalid forward input parameters.");
    }
}

// --- Undoable Reset ---
function resetPanelWithUndo(panel) {
    if (panel === 'rev') {
        undoCache.rev = {
            dia: revDiaSearch ? revDiaSearch.value() : els.rev.dia.value,
            diaCustom: revDiaSearch ? revDiaSearch.is_custom() : false,
            diaUnit: els.rev.diaUnit.value,
            material: els.rev.material.value,
            vc: els.rev.vc.value,
            vcUnit: els.rev.vcUnit.value,
            fz: els.rev.fz.value,
            fzUnit: els.rev.fzUnit.value,
            flutes: els.rev.flutes ? els.rev.flutes.value : '1',
            minRpm: els.rev.minRpm ? els.rev.minRpm.value : '20.0',
            maxRpm: els.rev.maxRpm ? els.rev.maxRpm.value : '200.0'
        };

        els.rev.diaUnit.value = currentUnitSystem === 'metric' ? 'mm' : 'in';
        const defDia = currentUnitSystem === 'metric' ? "0.2489 (0.25mm / 0.0098in)" : "0.0098 (0.25mm)";
        if (revDiaSearch) revDiaSearch.setValue(defDia, false);
        els.rev.material.value = "Custom";
        els.rev.vc.value = currentUnitSystem === 'metric' ? "61.0" : "200.0";
        els.rev.fz.value = currentUnitSystem === 'metric' ? "12.7" : "0.5";
        if (els.rev.flutes) els.rev.flutes.value = "1";
        if (els.rev.minRpm) els.rev.minRpm.value = "20.0";
        if (els.rev.maxRpm) els.rev.maxRpm.value = "200.0";
        updateAdvancedBadge('rev');
        calculateReverse(true);

        showUndoToast("Recommend parameters reset to default.", () => {
            if (undoCache.rev) {
                els.rev.diaUnit.value = undoCache.rev.diaUnit;
                if (revDiaSearch) revDiaSearch.setValue(undoCache.rev.dia, undoCache.rev.diaCustom);
                els.rev.material.value = undoCache.rev.material;
                els.rev.vc.value = undoCache.rev.vc;
                els.rev.vcUnit.value = undoCache.rev.vcUnit;
                els.rev.fz.value = undoCache.rev.fz;
                els.rev.fzUnit.value = undoCache.rev.fzUnit;
                if (els.rev.flutes) els.rev.flutes.value = undoCache.rev.flutes;
                if (els.rev.minRpm) els.rev.minRpm.value = undoCache.rev.minRpm;
                if (els.rev.maxRpm) els.rev.maxRpm.value = undoCache.rev.maxRpm;
                updateAdvancedBadge('rev');
                calculateReverse(true);
                showToast("Restored previous parameters.");
            }
        });
    } else {
        if (!els.fwd.fr || !els.fwd.krpm) return;
        undoCache.fwd = {
            dia: fwdDiaSearch ? fwdDiaSearch.value() : (els.fwd.dia ? els.fwd.dia.value : ""),
            diaCustom: fwdDiaSearch ? fwdDiaSearch.is_custom() : false,
            diaUnit: els.fwd.diaUnit ? els.fwd.diaUnit.value : 'in',
            fr: els.fwd.fr.value,
            frUnit: els.fwd.frUnit ? els.fwd.frUnit.value : 'IPM',
            krpm: els.fwd.krpm.value,
            flutes: els.fwd.flutes ? els.fwd.flutes.value : '1'
        };

        if (els.fwd.diaUnit) els.fwd.diaUnit.value = currentUnitSystem === 'metric' ? 'mm' : 'in';
        const defDia = currentUnitSystem === 'metric' ? "0.2489 (0.25mm / 0.0098in)" : "0.0098 (0.25mm)";
        if (fwdDiaSearch) fwdDiaSearch.setValue(defDia, false);
        els.fwd.fr.value = currentUnitSystem === 'metric' ? "1.2" : "48.0";
        els.fwd.krpm.value = "78.0";
        if (els.fwd.flutes) els.fwd.flutes.value = "1";
        updateAdvancedBadge('fwd');
        calculateForward(true);

        showUndoToast("Verify parameters reset to default.", () => {
            if (undoCache.fwd) {
                if (els.fwd.diaUnit) els.fwd.diaUnit.value = undoCache.fwd.diaUnit;
                if (fwdDiaSearch) fwdDiaSearch.setValue(undoCache.fwd.dia, undoCache.fwd.diaCustom);
                els.fwd.fr.value = undoCache.fwd.fr;
                if (els.fwd.frUnit) els.fwd.frUnit.value = undoCache.fwd.frUnit;
                els.fwd.krpm.value = undoCache.fwd.krpm;
                if (els.fwd.flutes) els.fwd.flutes.value = undoCache.fwd.flutes;
                updateAdvancedBadge('fwd');
                calculateForward(true);
                showToast("Restored previous parameters.");
            }
        });
    }
}

// --- Clipboard Image Export & CSV ---
function copyTableToClipboard(panel = 'rev') {
    const tableBody = els[panel] ? els[panel].tableBody : els.rev.tableBody;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    
    if (rows.length === 0) {
        showToast("No data available to export.", "warning");
        return;
    }

    // Extract table rows data
    const rowData = [];
    rows.forEach(r => {
        if (r.classList.contains('divider-row')) {
            rowData.push({ isDivider: true, title: r.textContent.trim() });
        } else {
            const cells = r.querySelectorAll('td');
            if (cells.length === 3) {
                rowData.push({
                    isDivider: false,
                    param: cells[0].textContent.trim(),
                    imp: cells[1].textContent.trim(),
                    met: cells[2].textContent.trim()
                });
            }
        }
    });

    // Create High-DPI Canvas (2x scale for crystal-clear retina render)
    const scale = 2;
    const width = 880;
    
    const headerHeight = 76;
    const kpiHeight = 78;
    const tableHeaderHeight = 38;
    let tableRowsHeight = 0;
    rowData.forEach(item => {
        tableRowsHeight += item.isDivider ? 32 : 30;
    });
    const footerHeight = 44;
    const padding = 28;
    
    const height = padding + headerHeight + kpiHeight + tableHeaderHeight + tableRowsHeight + footerHeight + padding;
    
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Color Theme Styling
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const colors = {
        bg: isDark ? '#0f172a' : '#ffffff',
        cardBg: isDark ? '#1e293b' : '#f8fafc',
        cardBorder: isDark ? '#334155' : '#e2e8f0',
        textPrimary: isDark ? '#f8fafc' : '#0f172a',
        textSecondary: isDark ? '#94a3b8' : '#475569',
        textMuted: isDark ? '#64748b' : '#94a3b8',
        brandPrimary: '#4f46e5',
        brandLight: isDark ? '#312e81' : '#eef2ff',
        rowAlt: isDark ? '#172033' : '#f8fafc',
        dividerBg: isDark ? '#1e293b' : '#eef2ff',
        dividerText: isDark ? '#818cf8' : '#4338ca',
        accentBorder: '#6366f1'
    };

    // Background Canvas Fill
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Outer Border
    ctx.strokeStyle = colors.cardBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // 1. Header Section
    let curY = padding;
    
    // Brand Tag
    ctx.fillStyle = colors.brandPrimary;
    ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText("TCT PRECISION TOOLING", padding, curY + 12);

    // Timestamp (Right-aligned)
    ctx.fillStyle = colors.textMuted;
    ctx.font = '500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    const nowStr = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    ctx.fillText(nowStr, width - padding, curY + 12);
    ctx.textAlign = 'left';

    // Title
    ctx.fillStyle = colors.textPrimary;
    ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText("Feeds, Speeds & Machine Parameters Report", padding, curY + 38);

    // Subtitle
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const diaInput = revDiaSearch ? revDiaSearch.value() : els.rev.dia.value;
    ctx.fillText(`Target Tool: ${diaInput} | Precision CNC Calculation`, padding, curY + 58);

    curY += headerHeight;

    // 2. Summary KPI Cards (3 columns)
    const kpiW = (width - (padding * 2) - 20) / 3;
    const kpis = [
        { label: "RECOMMENDED FEED RATE", val: `${els.rev.kpiFr.textContent} IPM`, sub: els.rev.kpiFrSub.textContent },
        { label: "SPINDLE SPEED", val: `${els.rev.kpiKrpm.textContent} krpm`, sub: els.rev.kpiRpmSub.textContent },
        { label: "DRILLING MRR", val: `${els.rev.kpiMrr.textContent} in³/min`, sub: els.rev.kpiMrrSub.textContent }
    ];

    kpis.forEach((kpi, idx) => {
        const kX = padding + idx * (kpiW + 10);
        ctx.fillStyle = colors.cardBg;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(kX, curY, kpiW, 64, 6);
        } else {
            ctx.rect(kX, curY, kpiW, 64);
        }
        ctx.fill();
        ctx.strokeStyle = idx === 0 ? colors.accentBorder : colors.cardBorder;
        ctx.lineWidth = idx === 0 ? 1.5 : 1;
        ctx.stroke();

        ctx.fillStyle = idx === 0 ? colors.brandPrimary : colors.textMuted;
        ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(kpi.label, kX + 12, curY + 18);

        ctx.fillStyle = colors.textPrimary;
        ctx.font = 'bold 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(kpi.val, kX + 12, curY + 38);

        ctx.fillStyle = colors.textSecondary;
        ctx.font = '11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(kpi.sub, kX + 12, curY + 54);
    });

    curY += kpiHeight;

    // 3. Engineering Specs Table
    const col1W = 330;
    const col2W = 250;
    const col3W = width - (padding * 2) - col1W - col2W;

    // Table Header Background
    ctx.fillStyle = colors.cardBg;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(padding, curY, width - (padding * 2), tableHeaderHeight, [4, 4, 0, 0]);
    } else {
        ctx.rect(padding, curY, width - (padding * 2), tableHeaderHeight);
    }
    ctx.fill();
    ctx.strokeStyle = colors.cardBorder;
    ctx.stroke();

    // Table Header Text
    ctx.fillStyle = colors.textPrimary;
    ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText("ENGINEERING PARAMETER", padding + 12, curY + 23);
    ctx.fillText("IMPERIAL VALUE", padding + col1W + 12, curY + 23);
    ctx.fillText("METRIC EQUIVALENT", padding + col1W + col2W + 12, curY + 23);

    curY += tableHeaderHeight;

    // Table Rows
    let isZebra = false;
    rowData.forEach((item) => {
        if (item.isDivider) {
            ctx.fillStyle = colors.dividerBg;
            ctx.fillRect(padding, curY, width - (padding * 2), 30);
            ctx.strokeStyle = colors.cardBorder;
            ctx.strokeRect(padding, curY, width - (padding * 2), 30);

            ctx.fillStyle = colors.dividerText;
            ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(item.title.toUpperCase(), padding + 12, curY + 19);
            curY += 30;
            isZebra = false;
        } else {
            ctx.fillStyle = isZebra ? colors.rowAlt : colors.bg;
            ctx.fillRect(padding, curY, width - (padding * 2), 30);
            ctx.strokeStyle = colors.cardBorder;
            ctx.strokeRect(padding, curY, width - (padding * 2), 30);

            ctx.fillStyle = colors.textPrimary;
            ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(item.param, padding + 12, curY + 19);

            const isHighlighted = item.imp.includes('IPM') || item.imp.includes('krpm');
            ctx.fillStyle = isHighlighted ? colors.brandPrimary : colors.textPrimary;
            ctx.font = isHighlighted ? 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(item.imp, padding + col1W + 12, curY + 19);

            ctx.fillStyle = colors.textSecondary;
            ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(item.met, padding + col1W + col2W + 12, curY + 19);

            curY += 30;
            isZebra = !isZebra;
        }
    });

    // 4. Footer Bar
    curY += 14;
    ctx.fillStyle = colors.textMuted;
    ctx.font = '11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText("TCT CNC Portal • Verified Engineering Standards • ISO / DIN Compliant", padding, curY + 14);

    ctx.textAlign = 'right';
    ctx.fillText("Exported via TCT Calculator", width - padding, curY + 14);
    ctx.textAlign = 'left';

    // 5. Write Image to Clipboard as PNG Blob
    canvas.toBlob(async (blob) => {
        if (!blob) {
            showToast("Failed to generate report image.", "warning");
            return;
        }

        try {
            if (navigator.clipboard && window.ClipboardItem) {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                showToast("✓ Report image copied to clipboard! Paste directly into Slack, Teams, Email, or CAD.");
            } else {
                throw new Error("ClipboardItem API not supported");
            }
        } catch (err) {
            console.warn("Clipboard image write failed, falling back to download:", err);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TCT_Engineering_Parameters_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("✓ Report image downloaded as PNG.");
        }
    }, 'image/png', 1.0);
}

function exportTableCSV(panel) {
    const tableBody = els[panel].tableBody;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    
    if (rows.length === 0) {
        showToast("No data available to export.", "warning");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Engineering Parameter,Imperial Value,Metric Equivalent\n";

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 3) {
            const rowArr = Array.from(cells).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`);
            csvContent += rowArr.join(",") + "\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TCT_${panel === 'rev' ? 'Recommend_CNC_Speeds' : 'Verify_Tool_Engagement'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("✓ Exported engineering specifications CSV.");
}

// --- Global Shortcuts Handler ---
function handleGlobalKeydown(e) {
    // Check if user is typing in an input
    const isTyping = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);

    // Ctrl+Enter / Cmd+Enter -> Recalculate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        calculateAll(false);
        return;
    }

    // Ctrl+Shift+C -> Copy Table
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        const activePanel = currentWorkflowMode === 'verify' ? 'fwd' : 'rev';
        copyTableToClipboard(activePanel);
        return;
    }

    // Ctrl+Shift+E -> Export CSV
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        const activePanel = currentWorkflowMode === 'verify' ? 'fwd' : 'rev';
        exportTableCSV(activePanel);
        return;
    }

    // Ctrl+Shift+R -> Reset Panel
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        const activePanel = currentWorkflowMode === 'verify' ? 'fwd' : 'rev';
        resetPanelWithUndo(activePanel);
        return;
    }

    // Shift+D -> Toggle Theme
    if (e.shiftKey && (e.key === 'D' || e.key === 'd') && !isTyping) {
        e.preventDefault();
        toggleTheme();
        return;
    }

    // Shift+U -> Toggle Units
    if (e.shiftKey && (e.key === 'U' || e.key === 'u') && !isTyping) {
        e.preventDefault();
        applyGlobalUnitSystem(currentUnitSystem === 'imperial' ? 'metric' : 'imperial');
        return;
    }

    // Numbers 1, 2, 3, 4 -> Switch tabs
    if (!isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === '1') { setWorkflowMode('compare-clean'); }
        else if (e.key === '2') { setWorkflowMode('compare-material'); }
        else if (e.key === '3') { setWorkflowMode('recommend'); }
        else if (e.key === '4') { setWorkflowMode('verify'); }
        else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
            openShortcutsModal(true);
        }
    }

    // Escape -> Close modal
    if (e.key === 'Escape') {
        openShortcutsModal(false);
    }
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('tct_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.body.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    const nextTheme = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('tct_theme', nextTheme);
    updateThemeButton(nextTheme);
    showToast(`Switched to ${nextTheme} theme`);
}

function updateThemeButton(theme) {
    if (theme === 'dark') {
        els.themeIcon.textContent = '☀️';
        els.themeText.textContent = 'Light Mode';
    } else {
        els.themeIcon.textContent = '🌙';
        els.themeText.textContent = 'Dark Mode';
    }
}

// --- Modals & Toasts ---
function openShortcutsModal(show = true) {
    if (show) {
        els.shortcutsModal.classList.remove('hidden');
    } else {
        els.shortcutsModal.classList.add('hidden');
    }
}

function setStatus(text) {
    els.statusText.textContent = text;
}

function showToast(message, type = "normal") {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
    toast.textContent = message;
    
    els.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function showUndoToast(message, undoCallback) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);
    
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.onclick = () => {
        undoCallback();
        toast.remove();
    };
    toast.appendChild(undoBtn);
    
    els.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
            setTimeout(() => toast.remove(), 250);
        }
    }, 6000);
}

// --- DOM Ready Bootstrapping ---
document.addEventListener('DOMContentLoaded', init);
