// Data and state
let imperial_sizes = [];
let metric_sizes = [];

// Load sizes from sizesData defined in sizes.js
imperial_sizes = sizesData.imperial_sizes;
metric_sizes = sizesData.metric_sizes;



// Engineering Engine
class MachiningMathEngine {
    static parseDiameter(diaStr) {
        const cleanStr = diaStr.trim().split(" ")[0];
        if (cleanStr.includes('/')) {
            const [num, den] = cleanStr.split('/');
            return parseFloat(num) / parseFloat(den);
        }
        return parseFloat(cleanStr);
    }

    static calcForward(dia_in, rpm, ipm, flutes) {
        const sfm = (Math.PI * dia_in * rpm) / 12.0;
        const ipt = (rpm * flutes) > 0 ? ipm / (rpm * flutes) : 0.0;
        
        const area_in = (Math.PI * Math.pow(dia_in, 2)) / 4.0;
        const mrr_imp = area_in * ipm;
        
        const dia_mm = dia_in * 25.4;
        const ipm_mm = ipm * 25.4;
        const area_mm = (Math.PI * Math.pow(dia_mm, 2)) / 4.0;
        const mrr_met = (area_mm * ipm_mm) / 1000.0;
        
        return {sfm, ipt, mrr_imp, mrr_met};
    }

    static calcReverse(dia_in, sfm, ipt, flutes, max_rpm = 0.0) {
        let rpm_theoretical = dia_in > 0 ? (sfm * 12.0) / (Math.PI * dia_in) : 0.0;
        
        let capped = false;
        let rpm = rpm_theoretical;
        if (max_rpm > 0.0 && rpm > max_rpm) {
            rpm = max_rpm;
            capped = true;
        }
            
        const ipm = rpm * ipt * flutes;
        
        const area_in = (Math.PI * Math.pow(dia_in, 2)) / 4.0;
        const mrr_imp = area_in * ipm;
        
        const dia_mm = dia_in * 25.4;
        const ipm_mm = ipm * 25.4;
        const area_mm = (Math.PI * Math.pow(dia_mm, 2)) / 4.0;
        const mrr_met = (area_mm * ipm_mm) / 1000.0;
        
        const sfm_achieved = (Math.PI * dia_in * rpm) / 12.0;
        
        return {
            rpm, 
            rpm_original: rpm_theoretical,
            krpm: rpm / 1000.0,
            ipm,
            mrr_imp,
            mrr_met,
            capped,
            sfm_achieved
        };
    }
}

// UI Elements
const els = {
    fwd: {
        dia: document.getElementById('fwd-dia'),
        diaUnit: document.getElementById('fwd-dia-unit'),
        fr: document.getElementById('fwd-fr'),
        frUnit: document.getElementById('fwd-fr-unit'),
        krpm: document.getElementById('fwd-krpm'),
        flutes: document.getElementById('fwd-flutes'),
        tableBody: document.querySelector('#table-fwd tbody')
    },
    rev: {
        dia: document.getElementById('rev-dia'),
        diaUnit: document.getElementById('rev-dia-unit'),
        vc: document.getElementById('rev-vc'),
        vcUnit: document.getElementById('rev-vc-unit'),
        fz: document.getElementById('rev-fz'),
        fzUnit: document.getElementById('rev-fz-unit'),
        flutes: document.getElementById('rev-flutes'),
        maxRpm: document.getElementById('rev-max-rpm'),
        tableBody: document.querySelector('#table-rev tbody'),
        capWarn: document.getElementById('lbl-rev-cap-warn')
    },
    status: document.getElementById('status-text'),
    themeToggle: document.getElementById('theme-toggle')
};

// Initialize
function init() {
    // Populate the datalists
    populateDropdowns('fwd');
    populateDropdowns('rev');
    
    // Set default diameter
    els.fwd.dia.value = "0.0098 (0.25mm)";
    els.rev.dia.value = "0.0098 (0.25mm)";
    
    // Calculate defaults
    calculateAll(true);

    // Bind events
    const clearOnFocus = function() { 
        if (this.value !== '') {
            this.dataset.oldValue = this.value; 
            this.value = ''; 
        }
    };
    const restoreOnBlur = function() { 
        if (this.value === '') { 
            this.value = this.dataset.oldValue || ''; 
            this.dispatchEvent(new Event('input')); 
        } 
    };
    
    els.fwd.dia.addEventListener('focus', clearOnFocus);
    els.fwd.dia.addEventListener('click', clearOnFocus);
    els.fwd.dia.addEventListener('blur', restoreOnBlur);
    
    els.rev.dia.addEventListener('focus', clearOnFocus);
    els.rev.dia.addEventListener('click', clearOnFocus);
    els.rev.dia.addEventListener('blur', restoreOnBlur);

    const syncDia = (source, target) => {
        if (els[target].dia.value !== els[source].dia.value) {
            els[target].dia.value = els[source].dia.value;
            if (target === 'fwd') calculateForward(true);
            else calculateReverse(true);
        }
    };

    const syncDiaUnit = (source, target) => {
        if (els[target].diaUnit.value !== els[source].diaUnit.value) {
            els[target].diaUnit.value = els[source].diaUnit.value;
            populateDropdowns(target);
            if (target === 'fwd') calculateForward(true);
            else calculateReverse(true);
        }
    };

    els.fwd.dia.addEventListener('input', () => { calculateForward(); syncDia('fwd', 'rev'); });
    els.fwd.diaUnit.addEventListener('change', () => { populateDropdowns('fwd'); calculateForward(); syncDiaUnit('fwd', 'rev'); });
    els.fwd.fr.addEventListener('input', () => calculateForward());
    els.fwd.frUnit.addEventListener('change', () => calculateForward());
    els.fwd.krpm.addEventListener('input', () => calculateForward());
    els.fwd.flutes.addEventListener('input', () => calculateForward());
    
    document.getElementById('btn-fwd-calc').addEventListener('click', () => calculateForward(false));
    document.getElementById('btn-fwd-copy').addEventListener('click', () => copyToClipboard('fwd'));
    document.getElementById('btn-fwd-export').addEventListener('click', () => exportCSV('fwd'));
    document.getElementById('btn-fwd-reset').addEventListener('click', () => resetPanel('fwd'));


    els.rev.dia.addEventListener('input', () => { calculateReverse(); syncDia('rev', 'fwd'); });
    els.rev.diaUnit.addEventListener('change', () => { populateDropdowns('rev'); calculateReverse(); syncDiaUnit('rev', 'fwd'); });
    els.rev.vc.addEventListener('input', () => calculateReverse());
    els.rev.vcUnit.addEventListener('change', () => calculateReverse());
    els.rev.fz.addEventListener('input', () => calculateReverse());
    els.rev.fzUnit.addEventListener('change', () => calculateReverse());
    els.rev.flutes.addEventListener('input', () => calculateReverse());
    els.rev.maxRpm.addEventListener('input', () => calculateReverse());

    document.getElementById('btn-rev-calc').addEventListener('click', () => calculateReverse(false));
    document.getElementById('btn-rev-copy').addEventListener('click', () => copyToClipboard('rev'));
    document.getElementById('btn-rev-export').addEventListener('click', () => exportCSV('rev'));
    document.getElementById('btn-rev-reset').addEventListener('click', () => resetPanel('rev'));

    els.themeToggle.addEventListener('click', toggleTheme);

    // Focus trap to loop tab sequence and prevent escaping to browser UI (e.g. Tab Search)
    const tabInputs = [
        els.fwd.dia,
        els.fwd.fr,
        els.fwd.krpm,
        els.rev.vc,
        els.rev.fz
    ];

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const first = tabInputs[0];
            const last = tabInputs[tabInputs.length - 1];

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else { // Tab
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    });
}

function populateDropdowns(panel) {
    const el = els[panel];
    const unit = el.diaUnit.value;
    const sizes = unit === 'mm' ? metric_sizes : imperial_sizes;
    
    const dataList = document.getElementById(`${panel}-dia-list`);
    if (!dataList) return;
    
    dataList.innerHTML = '';
    sizes.forEach(size => {
        const opt = document.createElement('option');
        opt.value = size;
        dataList.appendChild(opt);
    });
}



function calculateAll(silent = true) {
    calculateForward(silent);
    calculateReverse(silent);
}

function calculateForward(silent = true) {
    try {
        const raw_dia = MachiningMathEngine.parseDiameter(els.fwd.dia.value);
        const krpm = parseFloat(els.fwd.krpm.value);
        const raw_fr = parseFloat(els.fwd.fr.value);
        const flutes = parseInt(els.fwd.flutes.value);
        const rpm = krpm * 1000.0;

        if (isNaN(rpm) || isNaN(flutes) || isNaN(raw_dia) || isNaN(raw_fr) || rpm <= 0 || flutes <= 0 || raw_dia <= 0 || raw_fr <= 0) {
            throw new Error("Invalid Input");
        }

        let base_dia_in = els.fwd.diaUnit.value === "mm" ? raw_dia / 25.4 : raw_dia;
        let base_ipm = raw_fr;
        if (els.fwd.frUnit.value === "m/min") base_ipm = (raw_fr * 1000.0) / 25.4;
        else if (els.fwd.frUnit.value === "mm/sec") base_ipm = (raw_fr * 60.0) / 25.4;

        const res = MachiningMathEngine.calcForward(base_dia_in, rpm, base_ipm, flutes);
        
        // Sync chipload to Reverse calculator
        let sync_fz;
        if (els.rev.fzUnit.value === 'mm/t' || els.rev.fzUnit.value === 'mm/rev') {
            sync_fz = (res.ipt * 25.4).toFixed(5);
        } else if (els.rev.fzUnit.value === 'micron per revoluation' || els.rev.fzUnit.value === 'micron per revolution') {
            sync_fz = (res.ipt * 25400.0).toFixed(1);
        } else if (els.rev.fzUnit.value === '0.001" per revoluation' || els.rev.fzUnit.value === '0.001" per revolution') {
            sync_fz = (res.ipt * 1000.0).toFixed(2);
        } else {
            sync_fz = res.ipt.toFixed(5); // fallback
        }
        els.rev.fz.value = sync_fz;
        
        // Sync cutting speed to Reverse calculator
        let vc_val = els.rev.vcUnit.value === 'm/min' ? res.sfm * 0.3048 : res.sfm;
        els.rev.vc.value = Math.max(1, Math.round(vc_val)).toString();

        const tbody = els.fwd.tableBody;
        tbody.innerHTML = '';
        
        const addRow = (param, imp, met) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${param}</td><td>${imp}</td><td>${met}</td>`;
            tbody.appendChild(tr);
        };

        addRow("Tool Diameter", `${base_dia_in.toFixed(4)} in`, `${(base_dia_in*25.4).toFixed(2)} mm`);
        addRow("Feed Rate", `${base_ipm.toFixed(0)} IPM`, `${(base_ipm*0.0254).toFixed(3)} m/min | ${(base_ipm*0.4233).toFixed(2)} mm/s`);
        addRow("Spindle Speed", `${krpm.toFixed(0)} krpm`, `${krpm.toFixed(0)} krpm`);
        addRow("---", "---", "---");
        addRow("Cutting Speed", `${res.sfm.toFixed(0)} SFM`, `${(res.sfm*0.3048).toFixed(0)} m/min`);
        addRow("Chipload (fz)", `${(res.ipt*1000).toFixed(2)} (0.001"/rev)`, `${(res.ipt*25400).toFixed(1)} micron/rev`);
        addRow("Drilling MRR", `${res.mrr_imp.toFixed(3)} in³/min`, `${res.mrr_met.toFixed(2)} cm³/min`);

        if (!silent) {
            setStatus("Forward speeds and feeds calculated successfully.");
        } else {
            setStatus("");
        }
    } catch (e) {
        if (!silent) alert("Please ensure all forward parameters contain valid positive numbers.");
        setStatus("Error: Invalid forward input parameter.");
        els.fwd.tableBody.innerHTML = '';
    }
}

function calculateReverse(silent = true) {
    try {
        const raw_dia = MachiningMathEngine.parseDiameter(els.rev.dia.value);
        const raw_vc = parseFloat(els.rev.vc.value);
        const raw_fz = parseFloat(els.rev.fz.value);
        const flutes = parseInt(els.rev.flutes.value);
        const max_rpm_str = els.rev.maxRpm.value;
        const max_rpm = max_rpm_str ? parseFloat(max_rpm_str) * 1000.0 : 0.0;

        if (isNaN(raw_dia) || isNaN(raw_vc) || isNaN(raw_fz) || isNaN(flutes) || isNaN(max_rpm) || raw_dia <= 0 || raw_vc <= 0 || raw_fz <= 0 || flutes <= 0 || max_rpm < 0) {
            throw new Error("Invalid Input");
        }

        let base_dia_in = els.rev.diaUnit.value === "mm" ? raw_dia / 25.4 : raw_dia;
        let base_sfm = els.rev.vcUnit.value === "m/min" ? raw_vc / 0.3048 : raw_vc;
        let base_ipt = raw_fz;
        if (els.rev.fzUnit.value === 'mm/t' || els.rev.fzUnit.value === 'mm/rev') {
            base_ipt = raw_fz / 25.4;
        } else if (els.rev.fzUnit.value === 'micron per revoluation' || els.rev.fzUnit.value === 'micron per revolution') {
            base_ipt = raw_fz / 25400.0;
        } else if (els.rev.fzUnit.value === '0.001" per revoluation' || els.rev.fzUnit.value === '0.001" per revolution') {
            base_ipt = raw_fz / 1000.0;
        }

        const res = MachiningMathEngine.calcReverse(base_dia_in, base_sfm, base_ipt, flutes, max_rpm);

        // Sync feed rate to Forward calculator
        let fr_val = res.ipm;
        if (els.fwd.frUnit.value === "m/min") fr_val = res.ipm * 0.0254;
        else if (els.fwd.frUnit.value === "mm/sec") fr_val = res.ipm * 0.4233;
        els.fwd.fr.value = Math.max(1, Math.round(fr_val)).toString();
        
        // Sync spindle speed to Forward calculator
        els.fwd.krpm.value = Math.max(1, Math.round(res.krpm)).toString();

        if (res.capped) {
            els.rev.capWarn.textContent = `⚠️ Spindle Capped at ${max_rpm_str} krpm! Feed Rate scaled to keep IPT chipload.`;
        } else {
            els.rev.capWarn.textContent = "";
        }

        const tbody = els.rev.tableBody;
        tbody.innerHTML = '';

        const addRow = (param, imp, met) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${param}</td><td>${imp}</td><td>${met}</td>`;
            tbody.appendChild(tr);
        };

        addRow("Tool Diameter", `${base_dia_in.toFixed(4)} in`, `${(base_dia_in*25.4).toFixed(2)} mm`);
        
        let sfm_label = `${base_sfm.toFixed(0)} SFM`;
        if (res.capped) sfm_label += ` (${res.sfm_achieved.toFixed(0)} achieved)`;
        addRow("Cutting Speed", sfm_label, `${(base_sfm*0.3048).toFixed(0)} m/min`);
        
        addRow("Chipload (fz)", `${(base_ipt*1000).toFixed(2)} (0.001"/rev)`, `${(base_ipt*25400).toFixed(1)} micron/rev`);
        addRow("---", "---", "---");
        
        let rpm_label = `${res.krpm.toFixed(0)} krpm`;
        if (res.capped) rpm_label += " [CAPPED]";
        addRow("Spindle Speed", rpm_label, `${res.krpm.toFixed(0)} krpm`);
        
        addRow("Feed Rate", `${res.ipm.toFixed(0)} IPM`, `${(res.ipm*0.0254).toFixed(3)} m/min | ${(res.ipm*0.4233).toFixed(2)} mm/s`);
        addRow("Drilling MRR", `${res.mrr_imp.toFixed(3)} in³/min`, `${res.mrr_met.toFixed(2)} cm³/min`);

        if (!silent) {
            setStatus("Reverse speeds and feeds calculated successfully.");
        } else {
            setStatus("");
        }
    } catch (e) {
        if (!silent) alert("Please ensure all reverse parameters contain valid positive numbers.");
        setStatus("Error: Invalid reverse input parameter.");
        els.rev.capWarn.textContent = "";
        els.rev.tableBody.innerHTML = '';
    }
}

function resetPanel(panel) {
    if (panel === 'fwd') {
        els.fwd.diaUnit.value = "in";
        populateDropdowns('fwd');
        els.fwd.dia.value = "0.0098 (0.25mm)";
        els.fwd.fr.value = "15.0";
        els.fwd.krpm.value = "3.0";
        els.fwd.flutes.value = "1";
        els.fwd.frUnit.value = "IPM";
        calculateForward(true);
    } else {
        els.rev.diaUnit.value = "in";
        populateDropdowns('rev');
        els.rev.dia.value = "0.0098 (0.25mm)";
        els.rev.vc.value = "200.0";
        els.rev.fz.value = "2.5";
        els.rev.flutes.value = "1";
        els.rev.maxRpm.value = "200.0";
        els.rev.vcUnit.value = "SFM";
        els.rev.fzUnit.value = '0.001" per revoluation';
        els.rev.capWarn.textContent = "";
        calculateReverse(true);
    }
    setStatus(`Reset ${panel === 'fwd' ? 'Forward' : 'Reverse'} calculator variables to defaults.`);
}

function toggleTheme() {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.body.setAttribute('data-theme', 'dark');
        els.themeToggle.textContent = '☀️ Light Mode';
    } else {
        document.body.setAttribute('data-theme', 'light');
        els.themeToggle.textContent = '🌙 Dark Mode';
    }
}

function setStatus(text) {
    els.status.textContent = text;
}

function copyToClipboard(panel) {
    const tableBody = els[panel].tableBody;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    
    if (rows.length === 0) {
        alert("No results available to copy.");
        return;
    }

    let clip_text = "Parameter\tImperial\tMetric\n";
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (!cells[0].textContent.includes("---")) {
            clip_text += `${cells[0].textContent}\t${cells[1].textContent}\t${cells[2].textContent}\n`;
        }
    });

    navigator.clipboard.writeText(clip_text).then(() => {
        setStatus("Successfully copied table data to system clipboard!");
    }).catch(err => {
        alert("Failed to copy: " + err);
    });
}

function exportCSV(panel) {
    const tableBody = els[panel].tableBody;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    
    if (rows.length === 0) {
        alert("No data available to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Parameter,Imperial,Metric\n";

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (!cells[0].textContent.includes("---")) {
            const rowArr = Array.from(cells).map(cell => `"${cell.textContent}"`);
            csvContent += rowArr.join(",") + "\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${panel === 'fwd' ? 'Forward' : 'Reverse'}_Calc_Data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatus(`Exported data successfully.`);
}

document.addEventListener('DOMContentLoaded', init);
