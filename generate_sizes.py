import csv
import json

imperial_sizes = []
metric_sizes = []

with open('33280_diameter_20260722.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        inch = row[0].strip()
        mm = row[1].strip().replace('"', '')
        if inch and mm:
            inch_val = float(inch)
            mm_val = f'{inch_val * 25.4:.4f}'.rstrip('0').rstrip('.')
            if mm_val == '': mm_val = '0'
            imperial_sizes.append(f'{inch} ({mm})')
            metric_sizes.append(f'{mm_val} ({mm} / {inch}in)')

with open('web_app/sizes.js', 'w') as f:
    f.write('const sizesData = {\n')
    f.write('  imperial_sizes: ' + json.dumps(imperial_sizes) + ',\n')
    f.write('  metric_sizes: ' + json.dumps(metric_sizes) + '\n')
    f.write('};\n')
