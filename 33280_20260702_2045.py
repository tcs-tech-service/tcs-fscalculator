import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import math
import csv
import os
import sys

class MachiningCalculatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Drilling Calculator")
        self.root.geometry("540x600")
        self.root.minsize(540, 600)
        self.root.configure(padx=20, pady=20)

        # Configure dynamic resizing
        self.root.columnconfigure(1, weight=1)
        self.root.rowconfigure(6, weight=1)

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

        # 1. Initialize StringVars with Realistic Defaults (1/4" drill, 15 IPM, 3 krpm, 2 flutes)
        self.var_diameter = tk.StringVar(value="0.0098 (0.25MM)")
        self.var_fr = tk.StringVar(value="48.0")
        self.var_krpm = tk.StringVar(value="78.0")
        self.var_flutes = tk.StringVar(value="1")

        self._setup_styles()
        self._build_ui()
        self._setup_bindings()
        
        # Trigger initial calculation for default values
        self.calculate_parameters(silent=True)

    def _setup_styles(self):
        """Configure custom styles for ttk widgets."""
        style = ttk.Style()
        
        # Title Style
        style.configure("Title.TLabel", font=("Arial", 14, "bold"))
        
        # --- Normal Button Styles ---
        style.configure("Calc.TButton", font=("Arial", 10, "bold"), foreground="red")
        style.configure("Export.TButton", font=("Arial", 10, "normal"), foreground="black")
        
        # --- Focused Button Styles ---
        style.configure("FocusedCalc.TButton", font=("Arial", 10, "bold underline"), foreground="#0056b3")
        style.configure("FocusedExport.TButton", font=("Arial", 10, "bold underline"), foreground="#0056b3")
        
        # --- Mouse Hover (Active) Mappings ---
        style.map("Calc.TButton", foreground=[('active', '#8b0000')])
        style.map("Export.TButton", foreground=[('active', '#0056b3')])

    def _build_ui(self):
        """Constructs and places all UI elements on the grid."""
        # 0. Header Frame (Logo + Title combined in Row 0)
        header_frame = ttk.Frame(self.root)
        header_frame.grid(row=0, column=0, columnspan=3, pady=(0, 15), sticky="ew")

        # --- Bulletproof Image Loading ---
        script_dir = os.path.dirname(os.path.abspath(__file__))
        logo_filename = "20150804 TCT logo.png"

        if getattr(sys, 'frozen', False):
            # If the script is bundled by PyInstaller, look in the temporary folder
            script_dir = sys._MEIPASS
        else:
            # If running as a normal .py script, look in the current file directory
            script_dir = os.path.dirname(os.path.abspath(__file__))

        logo_path = os.path.join(script_dir, logo_filename)

        try:
            if os.path.exists(logo_path):
                self.raw_logo = tk.PhotoImage(file=logo_path)
                self.logo_img = self.raw_logo.subsample(2, 2)
                logo_label = ttk.Label(header_frame, image=self.logo_img)
                logo_label.pack(side="top", anchor="w", pady=(0, 8))
            else:
                ttk.Label(
                    header_frame, 
                    text=f"[Logo file not found in script folder:\n{logo_filename}]", 
                    foreground="#d9534f", font=("Arial", 9, "italic"), justify="left"
                ).pack(side="top", anchor="w", pady=(0, 5))
        except Exception as e:
            ttk.Label(
                header_frame, 
                text=f"[Error loading image format: {e}]", 
                foreground="#d9534f", font=("Arial", 9, "italic")
            ).pack(side="top", anchor="w", pady=(0, 5))

        ttk.Label(header_frame, text="Drilling Parameters", style="Title.TLabel").pack(side="top")

        # 1. Tool Diameter (Combobox with Imperial Equivalents)
        ttk.Label(self.root, text="Tool Diameter:").grid(row=1, column=0, sticky="w", pady=5)
        
        self.entry_diameter = ttk.Combobox(
            self.root, width=24, textvariable=self.var_diameter, 
            values=self.imperial_sizes
        )
        self.entry_diameter.grid(row=1, column=1, padx=(0, 10), sticky="ew")
        
        self.combo_dia = ttk.Combobox(self.root, values=["in", "mm"], state="readonly", width=8)
        self.combo_dia.current(0)
        self.combo_dia.grid(row=1, column=2, sticky="w")

        # 2. Feed Rate
        ttk.Label(self.root, text="Feed Rate:").grid(row=2, column=0, sticky="w", pady=5)
        self.entry_fr = ttk.Entry(self.root, width=15, textvariable=self.var_fr)
        self.entry_fr.grid(row=2, column=1, padx=(0, 10), sticky="ew")
        
        self.combo_fr = ttk.Combobox(self.root, values=["IPM", "m/min", "mm/sec"], state="readonly", width=8)
        self.combo_fr.current(0)
        self.combo_fr.grid(row=2, column=2, sticky="w")

        # 3. Spindle Speed
        ttk.Label(self.root, text="Spindle Speed:").grid(row=3, column=0, sticky="w", pady=5)
        self.entry_krpm = ttk.Entry(self.root, width=15, textvariable=self.var_krpm)
        self.entry_krpm.grid(row=3, column=1, padx=(0, 10), sticky="ew")
        ttk.Label(self.root, text="krpm").grid(row=3, column=2, sticky="w")

        # 4. Number of Flutes
        ttk.Label(self.root, text="Number of Flutes:").grid(row=4, column=0, sticky="w", pady=5)
        self.entry_flutes = ttk.Entry(self.root, width=15, textvariable=self.var_flutes)
        self.entry_flutes.grid(row=4, column=1, padx=(0, 10), sticky="ew")

        # 5. Buttons Frame
        button_frame = ttk.Frame(self.root)
        button_frame.grid(row=5, column=0, columnspan=3, pady=20)
        
        self.calc_button = ttk.Button(
            button_frame, text="Calculate", style="Calc.TButton", 
            command=lambda: self.calculate_parameters(silent=False), takefocus=True
        )
        self.calc_button.pack(side="left", padx=10, ipadx=20)

        self.export_button = ttk.Button(
            button_frame, text="Export to CSV", style="Export.TButton",
            command=self.export_to_csv, takefocus=True
        )
        self.export_button.pack(side="left", padx=10, ipadx=10)

        # 6. Results Table
        columns = ("Parameter", "Imperial", "Metric")
        self.result_table = ttk.Treeview(self.root, columns=columns, show="headings", height=6)
        
        self.result_table.heading("Parameter", text="Parameter")
        self.result_table.heading("Imperial", text="Imperial")
        self.result_table.heading("Metric", text="Metric")
        
        self.result_table.column("Parameter", width=120, anchor="center", stretch=True)
        self.result_table.column("Imperial", width=120, anchor="center", stretch=True)
        self.result_table.column("Metric", width=180, anchor="center", stretch=True)
        
        self.result_table.grid(row=6, column=0, columnspan=3, pady=5, sticky="nsew")

    def _setup_bindings(self):
        """Configures real-time event tracing and keyboard accessibility."""
        for var in (self.var_diameter, self.var_fr, self.var_krpm, self.var_flutes):
            var.trace_add("write", self._on_input_change)

        self.combo_dia.bind("<<ComboboxSelected>>", self._on_input_change)
        self.combo_fr.bind("<<ComboboxSelected>>", self._on_input_change)
        self.entry_diameter.bind("<<ComboboxSelected>>", self._on_input_change)

        self.root.bind('<Return>', lambda event: self.calculate_parameters(silent=False))
        
        self.calc_button.bind('<Return>', self._trigger_calc)
        self.calc_button.bind('<space>', self._trigger_calc)
        self.calc_button.bind('<FocusIn>', self._on_focus_in)
        self.calc_button.bind('<FocusOut>', self._on_focus_out)

        self.export_button.bind('<Return>', self._trigger_export)
        self.export_button.bind('<space>', self._trigger_export)
        self.export_button.bind('<FocusIn>', self._on_focus_in)
        self.export_button.bind('<FocusOut>', self._on_focus_out)

    def _on_input_change(self, *args):
        """Callback for variable traces. Triggers silent real-time calculation."""
        if hasattr(self, 'entry_diameter'):
            if self.combo_dia.get() == "mm":
                self.entry_diameter['values'] = self.metric_sizes
            else:
                self.entry_diameter['values'] = self.imperial_sizes
                
        self.calculate_parameters(silent=True)

    def _on_focus_in(self, event):
        if event.widget == self.calc_button:
            self.calc_button.configure(style="FocusedCalc.TButton")
        elif event.widget == self.export_button:
            self.export_button.configure(style="FocusedExport.TButton")

    def _on_focus_out(self, event):
        if event.widget == self.calc_button:
            self.calc_button.configure(style="Calc.TButton")
        elif event.widget == self.export_button:
            self.export_button.configure(style="Export.TButton")

    def _trigger_calc(self, event):
        self.calc_button.invoke()
        return "break"

    def _trigger_export(self, event):
        self.export_button.invoke()
        return "break"

    def _clear_table(self):
        """Helper to clear table data when live inputs are incomplete or invalid."""
        for item in self.result_table.get_children():
            self.result_table.delete(item)

    def calculate_parameters(self, silent=False):
        """Reads inputs, normalizes units, calculates SFM/IPT, and updates the table.
           If silent=True, suppresses error popups (used for real-time typing)."""
        try:
            # 1. Safely parse the leading number from the diameter string
            dia_str = self.var_diameter.get().strip()
            if not dia_str:
                self._clear_table()
                return
                
            # .split()[0] grabs only the first word/number before any spaces or parentheses
            raw_dia = float(dia_str.split()[0])
            
            krpm = float(self.var_krpm.get())
            raw_fr = float(self.var_fr.get())
            flutes = int(self.var_flutes.get())
            
            rpm = krpm * 1000
            
            # 2. Strict Input Validation
            if rpm <= 0 or flutes <= 0 or raw_dia <= 0 or raw_fr <= 0:
                if not silent:
                    messagebox.showerror("Input Error", "All parameters must be greater than zero.")
                self._clear_table()
                return

            # 3. Input Normalization
            dia_unit = self.combo_dia.get()
            base_dia_in = raw_dia / 25.4 if dia_unit == "mm" else raw_dia

            fr_unit = self.combo_fr.get()
            if fr_unit == "m/min":
                base_ipm = (raw_fr * 1000) / 25.4
            elif fr_unit == "mm/sec":
                base_ipm = (raw_fr * 60) / 25.4
            else:
                base_ipm = raw_fr

            # 4. Base Conversions for Display
            diameter_mm = base_dia_in * 25.4
            ipm_mm_min = base_ipm * 25.4
            ipm_m_min = ipm_mm_min / 1000
            ipm_mm_sec = ipm_mm_min / 60

            # 5. Math Calculations
            cutting_speed_sfm = (math.pi * base_dia_in * rpm) / 12
            chipload_ipt = base_ipm / (rpm * flutes)

            cutting_speed_mmin = cutting_speed_sfm * 0.3048
            chipload_mm = chipload_ipt * 25.4

            # 6. Update Table
            self._clear_table()
            self.result_table.insert("", "end", values=("Tool Diameter", f"{base_dia_in:.4f} in", f"{diameter_mm:.4f} mm"))
            self.result_table.insert("", "end", values=("Feed Rate", f"{base_ipm:.1f} IPM", f"{ipm_m_min:.3f} m/min | {ipm_mm_sec:.2f} mm/s"))
            self.result_table.insert("", "end", values=("Spindle Speed", f"{krpm:.2f} krpm", f"{krpm:.2f} krpm"))
            self.result_table.insert("", "end", values=("---", "---", "---")) 
            self.result_table.insert("", "end", values=("Cutting Speed", f"{cutting_speed_sfm:.2f} SFM", f"{cutting_speed_mmin:.2f} m/min"))
            self.result_table.insert("", "end", values=("Chipload", f"{chipload_ipt:.5f} IPT", f"{chipload_mm:.4f} mm/t"))
            
        except (ValueError, IndexError):
            if not silent:
                messagebox.showerror("Input Error", "Please enter valid numerical values in all fields.")
            self._clear_table()

    def export_to_csv(self):
        """Exports the current table data to a CSV file, ignoring divider rows."""
        children = self.result_table.get_children()
        if not children:
            messagebox.showwarning("Export Error", "No data to export. Please run a calculation first.")
            return

        filepath = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV Files", "*.csv"), ("Text Files", "*.txt"), ("All Files", "*.*")],
            title="Save Drilling Data"
        )

        if not filepath:
            return 

        try:
            with open(filepath, mode="w", newline="", encoding="utf-8") as file:
                writer = csv.writer(file)
                writer.writerow(["Parameter", "Imperial", "Metric"])
                
                for item in children:
                    row_data = self.result_table.item(item)["values"]
                    if "---" in str(row_data[0]):
                        continue
                    writer.writerow(row_data)
            
            messagebox.showinfo("Success", f"Data successfully exported to:\n{filepath}")
            
        except Exception as e:
            messagebox.showerror("Export Error", f"An error occurred while saving the file:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = MachiningCalculatorApp(root)
    root.mainloop()