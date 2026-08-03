import os
import xlrd

desktop = r"C:\Users\asahi\Desktop"
output_path = r"c:\gemini_cli\業務課ツール\parsed_excel.txt"

with open(output_path, "w", encoding="utf-8") as out:
    for name in os.listdir(desktop):
        out.write(f"File: {name}\n")
        if name.endswith(".xls") or name.endswith(".xlsx"):
            full_p = os.path.join(desktop, name)
            try:
                wb = xlrd.open_workbook(full_p)
                for sheet_name in wb.sheet_names():
                    out.write(f"  --- Sheet: {sheet_name} ---\n")
                    sheet = wb.sheet_by_name(sheet_name)
                    for r in range(sheet.nrows):
                        row_vals = []
                        for c in range(sheet.ncols):
                            val = sheet.cell_value(r, c)
                            if str(val).strip() != '':
                                row_vals.append(f"C{c}:{val}")
                        if row_vals:
                            out.write(f"    Row {r:2d}: " + " | ".join(row_vals) + "\n")
            except Exception as e:
                out.write(f"    Error: {e}\n")

print("Done parsing")
