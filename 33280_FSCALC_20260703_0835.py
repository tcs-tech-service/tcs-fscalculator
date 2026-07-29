import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from fractions import Fraction
from typing import Dict, Any, List, Tuple, Optional
import math
import csv
import os
import sys

# --- Engineering Calculation Engine ---
class MachiningMathEngine:
    """Decoupled mathematical engine for machining speeds, feeds, and MRR."""
    
    @staticmethod
    def parse_diameter(dia_str: str) -> float:
        """Safely parses decimal strings or fractions (e.g., '1/4' or '0.2500 (1/4 MM)')."""
        clean_str = dia_str.strip().split()[0]
        try:
            return float(clean_str)
        except ValueError:
            return float(Fraction(clean_str))

    @staticmethod
    def calc_forward(dia_in: float, rpm: float, ipm: float, flutes: int) -> Dict[str, float]:
        """Calculates SFM, IPT, and MRR from spindle speed and feed rate."""
        sfm = (math.pi * dia_in * rpm) / 12.0
        ipt = ipm / (rpm * flutes) if (rpm * flutes) > 0 else 0.0
        
        # Drilling MRR: (Area * Feed)
        area_in = (math.pi * (dia_in ** 2)) / 4.0
        mrr_imp = area_in * ipm
        
        dia_mm = dia_in * 25.4
        ipm_mm = ipm * 25.4
        area_mm = (math.pi * (dia_mm ** 2)) / 4.0
        mrr_met = (area_mm * ipm_mm) / 1000.0 # cm^3/min
        
        return {
            "sfm": sfm,
            "ipt": ipt,
            "mrr_imp": mrr_imp,
            "mrr_met": mrr_met
        }

    @staticmethod
    def calc_reverse(dia_in: float, sfm: float, ipt: float, flutes: int) -> Dict[str, float]:
        """Calculates RPM, IPM, and MRR from cutting speed and chipload."""
        rpm = (sfm * 12.0) / (math.pi * dia_in) if dia_in > 0 else 0.0
        ipm = rpm * ipt * flutes
        
        area_in = (math.pi * (dia_in ** 2)) / 4.0
        mrr_imp = area_in * ipm
        
        dia_mm = dia_in * 25.4
        ipm_mm = ipm * 25.4
        area_mm = (math.pi * (dia_mm ** 2)) / 4.0
        mrr_met = (area_mm * ipm_mm) / 1000.0 # cm^3/min
        
        return {
            "rpm": rpm,
            "krpm": rpm / 1000.0,
            "ipm": ipm,
            "mrr_imp": mrr_imp,
            "mrr_met": mrr_met
        }


# --- Main GUI Application ---
class MachiningCalculatorApp:
    # Preset Material Speeds (SFM) and starting Chiploads (IPT for 1/4" tool)
    MATERIAL_PRESETS: Dict[str, Dict[str, float]] = {
        "Custom / Manual Entry": {"sfm": 200.0, "ipt": 0.0005},
        "FR4": {"sfm": 400.0, "ipt": 0.0005},
        "High Speed Digital": {"sfm": 200.0, "ipt": 0.0005},
        "Polyimide": {"sfm": 200.0, "ipt": 0.0005},
        "Teflon": {"sfm": 200.0, "ipt": 0.0009},
    }

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("TCT Drilling Parameters")
        self.root.geometry("1160x720")
        self.root.minsize(1080, 640)
        self.root.configure(padx=15, pady=15)

        self.root.columnconfigure(0, weight=1, uniform="panel")
        self.root.columnconfigure(1, weight=1, uniform="panel")
        self.root.rowconfigure(1, weight=1)

        # Comprehensive Imperial Drill List (Decimal + Wire Gage/Fraction/Metric Equivalent)
        self.imperial_sizes = [
            "0.0039 (0.10MM)",
            "0.0051 (0.13MM)",
            "0.0059 (#97 - 0.15MM)",
            "0.0063 (#96)",
            "0.0067 (#95)",
            "0.0071 (#94)",
            "0.0075 (#93)",
            "0.0079 (#92 - 0.20MM)",
            "0.0083 (#91)",
            "0.0087 (#90)",
            "0.0091 (#89)",
            "0.0095 (#88)",
            "0.0098 (0.25MM)",
            "0.0100 (#87)",
            "0.0105 (#86)",
            "0.0110 (#85)",
            "0.0115 (#84)",
            "0.0118 (0.30MM)",
            "0.0120 (#83)",
            "0.0125 (#82)",
            "0.0130 (#81)",
            "0.0135 (#80)",
            "0.0138 (0.35MM)",
            "0.0145 (#79)",
            "0.0156 (1/64)",
            "0.0157 (0.40MM)",
            "0.0160 (#78)",
            "0.0177 (0.45MM)",
            "0.0180 (#77)",
            "0.0197 (0.50MM)",
            "0.0200 (#76)",
            "0.0210 (#75)",
            "0.0217 (0.55MM)",
            "0.0225 (#74)",
            "0.0236 (0.60MM)",
            "0.0240 (#73)",
            "0.0250 (#72)",
            "0.0256 (0.65MM)",
            "0.0260 (#71)",
            "0.0276 (0.70MM)",
            "0.0280 (#70)",
            "0.0292 (#69)",
            "0.0295 (0.75MM)",
            "0.0310 (#68)",
            "0.0312 (1/32)",
            "0.0315 (0.80MM)",
            "0.0320 (#67)",
            "0.0330 (#66)",
            "0.0335 (0.85MM)",
            "0.0350 (#65)",
            "0.0354 (0.90MM)",
            "0.0360 (#64)",
            "0.0370 (#63)",
            "0.0374 (0.95MM)",
            "0.0380 (#62)",
            "0.0390 (#61)",
            "0.0394 (1.00MM)",
            "0.0400 (#60)",
            "0.0410 (#59)",
            "0.0413 (1.05MM)",
            "0.0420 (#58)",
            "0.0430 (#57)",
            "0.0433 (1.10MM)",
            "0.0441 (1.12MM)",
            "0.0453 (1.15MM)",
            "0.0465 (#56)",
            "0.0469 (3/64)",
            "0.0472 (1.20MM)",
            "0.0492 (1.25MM)",
            "0.0512 (1.30MM)",
            "0.0520 (#55)",
            "0.0531 (1.35MM)",
            "0.0550 (#54)",
            "0.0551 (1.40MM)",
            "0.0571 (1.45MM)",
            "0.0591 (1.50MM)",
            "0.0595 (#53)",
            "0.0610 (1.55MM)",
            "0.0625 (1/16)",
            "0.0630 (1.60MM)",
            "0.0635 (#52)",
            "0.0650 (1.65MM)",
            "0.0669 (1.70MM)",
            "0.0670 (#51)",
            "0.0689 (1.75MM)",
            "0.0700 (#50)",
            "0.0709 (1.80MM)",
            "0.0728 (1.85MM)",
            "0.0730 (#49)",
            "0.0748 (1.90MM)",
            "0.0760 (#48)",
            "0.0768 (1.95MM)",
            "0.0781 (5/64)",
            "0.0785 (#47)",
            "0.0787 (2.00MM)",
            "0.0807 (2.05MM)",
            "0.0810 (#46)",
            "0.0820 (#45)",
            "0.0827 (2.10MM)",
            "0.0846 (2.15MM)",
            "0.0860 (#44)",
            "0.0866 (2.20MM)",
            "0.0886 (2.25MM)",
            "0.0890 (#43)",
            "0.0906 (2.30MM)",
            "0.0925 (2.35MM)",
            "0.0935 (#42)",
            "0.0938 (3/32)",
            "0.0945 (2.40MM)",
            "0.0960 (#41)",
            "0.0965 (2.45MM)",
            "0.0980 (#40)",
            "0.0984 (2.50MM)",
            "0.0995 (#39)",
            "0.1004 (2.55MM)",
            "0.1015 (#38)",
            "0.1024 (2.60MM)",
            "0.1040 (#37)",
            "0.1043 (2.65MM)",
            "0.1063 (2.70MM)",
            "0.1065 (#36)",
            "0.1083 (2.75MM)",
            "0.1094 (7/64)",
            "0.1100 (#35)",
            "0.1102 (2.80MM)",
            "0.1110 (#34)",
            "0.1122 (2.85MM)",
            "0.1130 (#33)",
            "0.1142 (2.90MM)",
            "0.1160 (#32)",
            "0.1161 (2.95MM)",
            "0.1181 (3.00MM)",
            "0.1200 (#31)",
            "0.1201 (3.05MM)",
            "0.1220 (3.10MM)",
            "0.1240 (3.15MM)",
            "0.1250 (1/8)",
            "0.1260 (3.20MM)",
            "0.1280 (3.25MM)",
            "0.1285 (#30)",
            "0.1299 (3.30MM)",
            "0.1319 (3.35MM)",
            "0.1339 (3.40MM)",
            "0.1358 (3.45MM)",
            "0.1360 (#29)",
            "0.1378 (3.50MM)",
            "0.1398 (3.55MM)",
            "0.1405 (#28)",
            "0.1406 (9/64)",
            "0.1417 (3.60MM)",
            "0.1437 (3.65MM)",
            "0.1440 (#27)",
            "0.1457 (3.70MM)",
            "0.1470 (#26)",
            "0.1476 (3.75MM)",
            "0.1495 (#25)",
            "0.1496 (3.80MM)",
            "0.1516 (3.85MM)",
            "0.1520 (#24)",
            "0.1535 (3.90MM)",
            "0.1540 (#23)",
            "0.1555 (3.95MM)",
            "0.1562 (5/32)",
            "0.1570 (#22)",
            "0.1575 (4.00MM)",
            "0.1590 (#21)",
            "0.1594 (4.05MM)",
            "0.1610 (#20)",
            "0.1614 (4.10MM)",
            "0.1634 (4.15MM)",
            "0.1654 (4.20MM)",
            "0.1660 (#19)",
            "0.1673 (4.25MM)",
            "0.1693 (4.30MM)",
            "0.1695 (#18)",
            "0.1713 (4.35MM)",
            "0.1719 (11/64)",
            "0.1730 (#17)",
            "0.1732 (4.40MM)",
            "0.1752 (4.45MM)",
            "0.1770 (#16)",
            "0.1772 (4.50MM)",
            "0.1791 (4.55MM)",
            "0.1800 (#15)",
            "0.1811 (4.60MM)",
            "0.1820 (#14)",
            "0.1831 (4.65MM)",
            "0.1850 (4.70MM)",
            "0.1870 (4.75MM)",
            "0.1875 (3/16)",
            "0.1890 (#12 - 4.80MM)",
            "0.1909 (4.85MM)",
            "0.1910 (#11)",
            "0.1929 (4.90MM)",
            "0.1935 (#10)",
            "0.1949 (4.95MM)",
            "0.1960 (#9)",
            "0.1969 (5.00MM)",
            "0.1988 (5.05MM)",
            "0.1990 (#8)",
            "0.2008 (5.10MM)",
            "0.2010 (#7)",
            "0.2028 (5.15MM)",
            "0.2031 (13/64)",
            "0.2040 (#6)",
            "0.2047 (5.20MM)",
            "0.2055 (#5)",
            "0.2067 (5.25MM)",
            "0.2087 (5.30MM)",
            "0.2090 (#4)",
            "0.2106 (5.35MM)",
            "0.2126 (5.40MM)",
            "0.2130 (#3)",
            "0.2146 (5.45MM)",
            "0.2165 (5.50MM)",
            "0.2185 (5.55MM)",
            "0.2188 (7/32)",
            "0.2205 (5.60MM)",
            "0.2210 (#2)",
            "0.2224 (5.65MM)",
            "0.2244 (5.70MM)",
            "0.2264 (5.75MM)",
            "0.2280 (#1)",
            "0.2283 (5.80MM)",
            "0.2303 (5.85MM)",
            "0.2323 (5.90MM)",
            "0.2340 (#A)",
            "0.2343 (5.95MM)",
            "0.2344 (15/64)",
            "0.2362 (6.00MM)",
            "0.2380 (#B)",
            "0.2382 (6.05MM)",
            "0.2402 (6.10MM)",
            "0.2420 (#C)",
            "0.2421 (6.15MM)",
            "0.2441 (6.20MM)",
            "0.2460 (#D)",
            "0.2461 (6.25MM)",
            "0.2480 (6.30MM)",
            "0.2500 (1/4 - 6.35MM)",
            "0.2520 (6.40MM)",
            "0.2559 (6.50MM)",
            "0.2570 (#F)",
            "0.2598 (6.60MM)",
            "0.2610 (#G)",
            "0.2638 (6.70MM)",
            "0.2656 (17/64)",
            "0.2657 (6.75MM)",
            "0.2660 (#H)",
            "0.2677 (6.80MM)",
            "0.2717 (6.90MM)",
            "0.2720 (#I)",
            "0.2756 (7.00MM)",
            "0.2770 (#J)"
        ]
        
        # Standard Metric Sizes
        self.metric_sizes = [
            "0.10", "0.13", "0.15", "0.20", "0.25", "0.30", "0.35", "0.40", "0.45", 
            "0.50", "0.55", "0.60", "0.65", "0.70", "0.75", "0.80", "0.85", "0.90", 
            "0.95", "1.00", "1.05", "1.10", "1.12", "1.15", "1.20", "1.25", "1.30", 
            "1.35", "1.40", "1.45", "1.50", "1.55", "1.60", "1.65", "1.70", "1.75", 
            "1.80", "1.85", "1.90", "1.95", "2.00", "2.05", "2.10", "2.15", "2.20", 
            "2.25", "2.30", "2.35", "2.40", "2.45", "2.50", "2.55", "2.60", "2.65", 
            "2.70", "2.75", "2.80", "2.85", "2.90", "2.95", "3.00", "3.05", "3.10", 
            "3.15", "3.20", "3.25", "3.30", "3.35", "3.40", "3.45", "3.50", "3.55", 
            "3.60", "3.65", "3.70", "3.75", "3.80", "3.85", "3.90", "3.95", "4.00", 
            "4.05", "4.10", "4.15", "4.20", "4.25", "4.30", "4.35", "4.40", "4.45", 
            "4.50", "4.55", "4.60", "4.65", "4.70", "4.75", "4.80", "4.85", "4.90", 
            "4.95", "5.00", "5.05", "5.10", "5.15", "5.20", "5.25", "5.30", "5.35", 
            "5.40", "5.45", "5.50", "5.55", "5.60", "5.65", "5.70", "5.75", "5.80", 
            "5.85", "5.90", "5.95", "6.00", "6.05", "6.10", "6.15", "6.20", "6.25", 
            "6.30", "6.35", "6.40", "6.50", "6.60", "6.70", "6.75", "6.80", "6.90", "7.00"
        ]

        # --- Variables ---
        self.var_status = tk.StringVar(value="Ready | Waiting for input...")
        
        # Forward Vars
        self.var_fwd_dia = tk.StringVar(value="0.0098 (0.25MM)")
        self.var_fwd_fr = tk.StringVar(value="48.0")
        self.var_fwd_krpm = tk.StringVar(value="78.0")
        self.var_fwd_flutes = tk.StringVar(value="1")

        # Reverse Vars
        self.var_rev_mat = tk.StringVar(value="Custom / Manual Entry")
        self.var_rev_dia = tk.StringVar(value="0.0098 (0.25MM)")
        self.var_rev_vc = tk.StringVar(value="200.0")
        self.var_rev_fz = tk.StringVar(value="0.0005")
        self.var_rev_flutes = tk.StringVar(value="1")

        self._setup_styles()
        self._build_header()
        self._build_left_panel()
        self._build_right_panel()
        self._build_status_bar()
        self._setup_bindings()
        
        self.calculate_all(silent=True)

    def _setup_styles(self):
        style = ttk.Style()
        style.configure("Title.TLabel", font=("Segoe UI", 16, "bold"))
        style.configure("Subtitle.TLabel", font=("Segoe UI", 9, "italic"), foreground="#666666")
        style.configure("Panel.TLabelframe.Label", font=("Segoe UI", 11, "bold"), foreground="#004080")
        style.configure("Status.TLabel", font=("Segoe UI", 9), foreground="#333333")
        style.configure("Action.TButton", font=("Segoe UI", 9, "bold"))

    def _build_header(self):
        header_frame = ttk.Frame(self.root)
        header_frame.grid(row=0, column=0, columnspan=2, pady=(0, 10), sticky="ew")

        script_dir = sys._MEIPASS if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(script_dir, "20150804 TCT logo.png")

        try:
            if os.path.exists(logo_path):
                self.raw_logo = tk.PhotoImage(file=logo_path)
                self.logo_img = self.raw_logo.subsample(2, 2)
                ttk.Label(header_frame, image=self.logo_img).pack(side="top", anchor="center", pady=(0, 4))
        except Exception:
            pass 

        ttk.Label(header_frame, text="Feeds & Speeds Calculator", style="Title.TLabel").pack(side="top", anchor="center")
        ttk.Label(header_frame, text="Real-time bi-directional conversion, material removal rates (MRR), and CAD/CAM export", style="Subtitle.TLabel").pack(side="top", anchor="center")

    def _add_input_row(self, parent: ttk.Frame, row: int, label: str, var: tk.StringVar, 
                       units: List[str], is_combo: bool = False, combo_values: Optional[List[str]] = None) -> ttk.Combobox:
        """Helper to cleanly construct standardized UI input rows without boilerplate."""
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=5)
        
        if is_combo:
            widget = ttk.Combobox(parent, textvariable=var, values=combo_values or [])
        else:
            widget = ttk.Entry(parent, textvariable=var)
            
        widget.grid(row=row, column=1, padx=5, sticky="ew")
        
        if len(units) > 1:
            unit_combo = ttk.Combobox(parent, values=units, state="readonly", width=8)
            unit_combo.current(0)
            unit_combo.grid(row=row, column=2, sticky="w")
            return unit_combo
        else:
            ttk.Label(parent, text=units[0]).grid(row=row, column=2, sticky="w", padx=2)
            return None

    def _build_left_panel(self):
        frame = ttk.LabelFrame(self.root, text=" Forward: Machine Inputs ➔ Tool Engagement ", style="Panel.TLabelframe", padding=15)
        frame.grid(row=1, column=0, padx=(0, 8), sticky="nsew")
        frame.columnconfigure(1, weight=1)

        self.combo_fwd_dia_unit = self._add_input_row(frame, 0, "Tool Diameter:", self.var_fwd_dia, ["in", "mm"], True, self.imperial_sizes)
        self.combo_fwd_fr_unit = self._add_input_row(frame, 1, "Feed Rate:", self.var_fwd_fr, ["IPM", "m/min", "mm/sec"])
        self._add_input_row(frame, 2, "Spindle Speed:", self.var_fwd_krpm, ["krpm"])
        self._add_input_row(frame, 3, "Flutes (Z):", self.var_fwd_flutes, ["flutes"])

        # Control Buttons
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=4, column=0, columnspan=3, pady=12)
        ttk.Button(btn_frame, text="Calculate", style="Action.TButton", command=lambda: self.calculate_forward(False)).pack(side="left", padx=4)
        ttk.Button(btn_frame, text="Copy Results", command=lambda: self.copy_to_clipboard(self.table_fwd)).pack(side="left", padx=4)
        ttk.Button(btn_frame, text="Export CSV", command=lambda: self.export_to_csv(self.table_fwd, "Forward_Calc")).pack(side="left", padx=4)
        ttk.Button(btn_frame, text="Reset", command=lambda: self.reset_panel('fwd')).pack(side="left", padx=4)

        self.table_fwd = self._create_treeview(frame)
        self.table_fwd.grid(row=5, column=0, columnspan=3, sticky="nsew", pady=(5, 0))
        frame.rowconfigure(5, weight=1)

    def _build_right_panel(self):
        frame = ttk.LabelFrame(self.root, text=" Reverse: Tool Engagement ➔ Machine Inputs ", style="Panel.TLabelframe", padding=15)
        frame.grid(row=1, column=1, padx=(8, 0), sticky="nsew")
        frame.columnconfigure(1, weight=1)

        # Material Preset Selector
        ttk.Label(frame, text="Material Preset:").grid(row=0, column=0, sticky="w", pady=5)
        self.combo_rev_mat = ttk.Combobox(frame, textvariable=self.var_rev_mat, values=list(self.MATERIAL_PRESETS.keys()), state="readonly")
        self.combo_rev_mat.grid(row=0, column=1, columnspan=2, padx=5, sticky="ew")

        self.combo_rev_dia_unit = self._add_input_row(frame, 1, "Tool Diameter:", self.var_rev_dia, ["in", "mm"], True, self.imperial_sizes)
        self.combo_rev_vc_unit = self._add_input_row(frame, 2, "Cutting Speed:", self.var_rev_vc, ["SFM", "m/min"])
        self.combo_rev_fz_unit = self._add_input_row(frame, 3, "Chipload (fz):", self.var_rev_fz, ["IPT", "mm/t"])
        self._add_input_row(frame, 4, "Flutes (Z):", self.var_rev_flutes, ["flutes"])

        # Control Buttons
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=5, column=0, columnspan=3, pady=12)
        ttk.Button(btn_frame, text="Calculate", style="Action.TButton", command=lambda: self.calculate_reverse(False)).pack(side="left", padx=4)
        ttk.Button(btn_frame, text="Copy Results", command=lambda: self.copy_to_clipboard(self.table_rev)).pack(side="left", padx=4)
        ttk.Button(btn_frame, text="Export CSV", command=lambda: self.export_to_csv(self.table_rev, "Reverse_Calc")).pack(side="left", padx=4)
        ttk.Button(btn_frame, text="Reset", command=lambda: self.reset_panel('rev')).pack(side="left", padx=4)

        self.table_rev = self._create_treeview(frame)
        self.table_rev.grid(row=6, column=0, columnspan=3, sticky="nsew", pady=(5, 0))
        frame.rowconfigure(6, weight=1)

    def _build_status_bar(self):
        status_frame = ttk.Frame(self.root, relief="sunken", padding=(8, 3))
        status_frame.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        ttk.Label(status_frame, textvariable=self.var_status, style="Status.TLabel").pack(side="left")

    def _create_treeview(self, parent: ttk.Frame) -> ttk.Treeview:
        columns = ("Parameter", "Imperial", "Metric")
        tv = ttk.Treeview(parent, columns=columns, show="headings", height=7)
        tv.heading("Parameter", text="Parameter")
        tv.heading("Imperial", text="Imperial")
        tv.heading("Metric", text="Metric")
        tv.column("Parameter", width=120, anchor="w", stretch=True)
        tv.column("Imperial", width=110, anchor="center", stretch=True)
        tv.column("Metric", width=160, anchor="center", stretch=True)
        return tv

    def _setup_bindings(self):
        for var in (self.var_fwd_dia, self.var_fwd_fr, self.var_fwd_krpm, self.var_fwd_flutes):
            var.trace_add("write", lambda *a: self.calculate_forward(silent=True))
        
        for var in (self.var_rev_dia, self.var_rev_vc, self.var_rev_fz, self.var_rev_flutes):
            var.trace_add("write", lambda *a: self.calculate_reverse(silent=True))

        self.combo_fwd_dia_unit.bind("<<ComboboxSelected>>", lambda e: self._on_unit_toggle('fwd'))
        self.combo_fwd_fr_unit.bind("<<ComboboxSelected>>", lambda e: self.calculate_forward(silent=True))
        self.combo_rev_dia_unit.bind("<<ComboboxSelected>>", lambda e: self._on_unit_toggle('rev'))
        self.combo_rev_vc_unit.bind("<<ComboboxSelected>>", lambda e: self.calculate_reverse(silent=True))
        self.combo_rev_fz_unit.bind("<<ComboboxSelected>>", lambda e: self.calculate_reverse(silent=True))
        
        # Material Preset Selection
        self.combo_rev_mat.bind("<<ComboboxSelected>>", self._on_material_select)

        self.root.bind('<Return>', lambda e: self.calculate_all(silent=False))

    def _on_material_select(self, event=None):
        """Auto-fills cutting speed and chipload based on selected workpiece material preset."""
        mat = self.var_rev_mat.get()
        if mat in self.MATERIAL_PRESETS and mat != "Custom / Manual Entry":
            preset = self.MATERIAL_PRESETS[mat]
            # Convert SFM/IPT to currently selected units if necessary
            sfm_val = preset["sfm"]
            ipt_val = preset["ipt"]
            
            if self.combo_rev_vc_unit.get() == "m/min":
                sfm_val *= 0.3048
            if self.combo_rev_fz_unit.get() == "mm/t":
                ipt_val *= 25.4
                
            self.var_rev_vc.set(f"{sfm_val:.1f}")
            self.var_rev_fz.set(f"{ipt_val:.4f}")
            self.var_status.set(f"Loaded preset: {mat}")

    def _on_unit_toggle(self, panel: str):
        if panel == 'fwd':
            unit = self.combo_fwd_dia_unit.get()
            self.root.nametowidget(self.combo_fwd_dia_unit.master.children['!combobox'])['values'] = self.metric_sizes if unit == "mm" else self.imperial_sizes
            self.calculate_forward(silent=True)
        else:
            unit = self.combo_rev_dia_unit.get()
            self.root.nametowidget(self.combo_rev_dia_unit.master.children['!combobox2'])['values'] = self.metric_sizes if unit == "mm" else self.imperial_sizes
            self.calculate_reverse(silent=True)

    def reset_panel(self, panel: str):
        if panel == 'fwd':
            self.var_fwd_dia.set("0.2500 (1/4 - 6.35MM)")
            self.var_fwd_fr.set("15.0")
            self.var_fwd_krpm.set("3.0")
            self.var_fwd_flutes.set("2")
            self.combo_fwd_dia_unit.current(0)
            self.combo_fwd_fr_unit.current(0)
        else:
            self.var_rev_mat.set("Custom / Manual Entry")
            self.var_rev_dia.set("0.2500 (1/4 - 6.35MM)")
            self.var_rev_vc.set("200.0")
            self.var_rev_fz.set("0.0025")
            self.var_rev_flutes.set("2")
            self.combo_rev_dia_unit.current(0)
            self.combo_rev_vc_unit.current(0)
            self.combo_rev_fz_unit.current(0)
        self.var_status.set(f"Reset {'Forward' if panel=='fwd' else 'Reverse'} panel to default parameters.")

    def calculate_all(self, silent: bool = False):
        self.calculate_forward(silent)
        self.calculate_reverse(silent)

    def calculate_forward(self, silent: bool = False):
        try:
            raw_dia = MachiningMathEngine.parse_diameter(self.var_fwd_dia.get())
            krpm = float(self.var_fwd_krpm.get())
            raw_fr = float(self.var_fwd_fr.get())
            flutes = int(self.var_fwd_flutes.get())
            rpm = krpm * 1000.0

            if rpm <= 0 or flutes <= 0 or raw_dia <= 0 or raw_fr <= 0:
                raise ValueError

            # Normalize to base Imperial units (Inches & IPM)
            base_dia_in = raw_dia / 25.4 if self.combo_fwd_dia_unit.get() == "mm" else raw_dia
            fr_unit = self.combo_fwd_fr_unit.get()
            if fr_unit == "m/min": base_ipm = (raw_fr * 1000.0) / 25.4
            elif fr_unit == "mm/sec": base_ipm = (raw_fr * 60.0) / 25.4
            else: base_ipm = raw_fr

            res = MachiningMathEngine.calc_forward(base_dia_in, rpm, base_ipm, flutes)

            for item in self.table_fwd.get_children(): self.table_fwd.delete(item)
            self.table_fwd.insert("", "end", values=("Tool Diameter", f"{base_dia_in:.4f} in", f"{base_dia_in*25.4:.4f} mm"))
            self.table_fwd.insert("", "end", values=("Feed Rate", f"{base_ipm:.1f} IPM", f"{base_ipm*0.0254:.3f} m/min | {base_ipm*0.4233:.2f} mm/s"))
            self.table_fwd.insert("", "end", values=("Spindle Speed", f"{krpm:.2f} krpm", f"{krpm:.2f} krpm"))
            self.table_fwd.insert("", "end", values=("---", "---", "---"))
            self.table_fwd.insert("", "end", values=("Cutting Speed", f"{res['sfm']:.2f} SFM", f"{res['sfm']*0.3048:.2f} m/min"))
            self.table_fwd.insert("", "end", values=("Chipload", f"{res['ipt']:.5f} IPT", f"{res['ipt']*25.4:.4f} mm/t"))
            self.table_fwd.insert("", "end", values=("Drilling MRR", f"{res['mrr_imp']:.3f} in³/min", f"{res['mrr_met']:.2f} cm³/min"))
            
            if not silent: self.var_status.set("Forward calculation updated successfully.")

        except (ValueError, IndexError, ZeroDivisionError):
            if not silent: messagebox.showerror("Input Error", "Please ensure all forward parameters contain valid positive numbers.")
            self.var_status.set("Error: Invalid forward input parameter.")
            for item in self.table_fwd.get_children(): self.table_fwd.delete(item)

    def calculate_reverse(self, silent: bool = False):
        try:
            raw_dia = MachiningMathEngine.parse_diameter(self.var_rev_dia.get())
            raw_vc = float(self.var_rev_vc.get())
            raw_fz = float(self.var_rev_fz.get())
            flutes = int(self.var_rev_flutes.get())

            if raw_dia <= 0 or raw_vc <= 0 or raw_fz <= 0 or flutes <= 0:
                raise ValueError

            # Normalize to base Imperial units (Inches, SFM, IPT)
            base_dia_in = raw_dia / 25.4 if self.combo_rev_dia_unit.get() == "mm" else raw_dia
            base_sfm = raw_vc / 0.3048 if self.combo_rev_vc_unit.get() == "m/min" else raw_vc
            base_ipt = raw_fz / 25.4 if self.combo_rev_fz_unit.get() == "mm/t" else raw_fz

            res = MachiningMathEngine.calc_reverse(base_dia_in, base_sfm, base_ipt, flutes)

            for item in self.table_rev.get_children(): self.table_rev.delete(item)
            self.table_rev.insert("", "end", values=("Tool Diameter", f"{base_dia_in:.4f} in", f"{base_dia_in*25.4:.4f} mm"))
            self.table_rev.insert("", "end", values=("Cutting Speed", f"{base_sfm:.2f} SFM", f"{base_sfm*0.3048:.2f} m/min"))
            self.table_rev.insert("", "end", values=("Chipload", f"{base_ipt:.5f} IPT", f"{base_ipt*25.4:.4f} mm/t"))
            self.table_rev.insert("", "end", values=("---", "---", "---"))
            self.table_rev.insert("", "end", values=("Spindle Speed", f"{res['krpm']:.2f} krpm ({int(res['rpm'])} RPM)", f"{res['krpm']:.2f} krpm"))
            self.table_rev.insert("", "end", values=("Feed Rate", f"{res['ipm']:.1f} IPM", f"{res['ipm']*0.0254:.3f} m/min | {res['ipm']*0.4233:.2f} mm/s"))
            self.table_rev.insert("", "end", values=("Drilling MRR", f"{res['mrr_imp']:.3f} in³/min", f"{res['mrr_met']:.2f} cm³/min"))

            if not silent: self.var_status.set("Reverse calculation updated successfully.")

        except (ValueError, IndexError, ZeroDivisionError):
            if not silent: messagebox.showerror("Input Error", "Please ensure all reverse parameters contain valid positive numbers.")
            self.var_status.set("Error: Invalid reverse input parameter.")
            for item in self.table_rev.get_children(): self.table_rev.delete(item)

    def copy_to_clipboard(self, target_table: ttk.Treeview):
        """Copies formatted table outputs directly to OS clipboard for CAD/CAM pasting."""
        children = target_table.get_children()
        if not children:
            messagebox.showwarning("Copy Error", "No results available to copy.")
            return

        lines = ["Parameter\tImperial\tMetric"]
        for item in children:
            row = target_table.item(item)["values"]
            if "---" not in str(row[0]):
                lines.append(f"{row[0]}\t{row[1]}\t{row[2]}")
                
        clip_text = "\n".join(lines)
        self.root.clipboard_clear()
        self.root.clipboard_append(clip_text)
        self.var_status.set("Successfully copied table data to system clipboard!")

    def export_to_csv(self, target_table: ttk.Treeview, prefix: str):
        children = target_table.get_children()
        if not children:
            messagebox.showwarning("Export Error", "No data available to export.")
            return

        filepath = filedialog.asksaveasfilename(
            defaultextension=".csv",
            initialfile=f"{prefix}_Data.csv",
            filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")],
            title="Save Machining Data"
        )

        if not filepath:
            return 

        try:
            with open(filepath, mode="w", newline="", encoding="utf-8-sig") as file:
                writer = csv.writer(file)
                writer.writerow(["Parameter", "Imperial", "Metric"])
                for item in children:
                    row_data = target_table.item(item)["values"]
                    if "---" not in str(row_data[0]):
                        writer.writerow(row_data)
            self.var_status.set(f"Exported data successfully to: {os.path.basename(filepath)}")
            messagebox.showinfo("Success", f"Data successfully exported to:\n{filepath}")
        except Exception as e:
            self.var_status.set("Error saving CSV file.")
            messagebox.showerror("Export Error", f"Failed to save file:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = MachiningCalculatorApp(root)
    root.mainloop()