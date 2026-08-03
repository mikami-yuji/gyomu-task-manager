import os
import xlrd

desktop = r"C:\Users\asahi\Desktop"
xls_files = [os.path.join(desktop, f) for f in os.listdir(desktop) if f.endswith(".xls")]

print(f"Found xls files: {xls_files}")

out_path = r"c:\gemini_cli\業務課ツール\excel_content.txt"

with open(out_path, "w", encoding="utf-8") as out:
    for file_path in xls_files:
        out.write(f"=== File: {file_path} ===\n")
        try:
            wb = xlrd.open_workbook(file_path)
            for sheet_name in wb.sheet_names():
                out.write(f"\n--- Sheet: {sheet_name} ---\n")
                sheet = wb.sheet_by_name(sheet_name)
                for r in range(sheet.nrows):
                    row_vals = []
                    for c in range(sheet.ncols):
                        val = sheet.cell_value(r, c)
                        if str(val).strip() != '':
                            row_vals.append(f"R{r}C{c}: [{val}]")
                    if row_vals:
                        out.write(" | ".join(row_vals) + "\n")
        except Exception as e:
            out.write(f"Error: {e}\n")

print("Finished writing to excel_content.txt")
