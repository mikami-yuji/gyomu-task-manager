const fs = require('fs');
const { execSync } = require('child_process');

const psCmd = `Get-ChildItem 'C:\\Users\\asahi\\Desktop' -Filter '*欠品*' | Select-Object -ExpandProperty FullName`;
const fullPath = execSync(`powershell -Command "${psCmd}"`).toString().trim().split('\r\n')[0];

console.log('Target file path:', fullPath);

const pyScript = `
import xlrd
wb = xlrd.open_workbook(r'''${fullPath}''')
sheet = wb.sheet_by_index(0)
for r in range(sheet.nrows):
    row_vals = []
    for c in range(sheet.ncols):
        val = sheet.cell_value(r, c)
        if str(val).strip() != '':
            row_vals.append(f"R{r}C{c}: [{val}]")
    if row_vals:
        print(f"Row {r:2d}: " + " | ".join(row_vals))
`;

fs.writeFileSync('temp_parse.py', pyScript, 'utf8');

try {
    const out = execSync(`python temp_parse.py`, { encoding: 'utf8' });
    console.log('=== Excel Output ===');
    console.log(out);
    fs.writeFileSync('excel_result.txt', out, 'utf8');
} catch (err) {
    console.error('Exec error:', err.message);
    if (err.stdout) console.log('Stdout:', err.stdout);
    if (err.stderr) console.log('Stderr:', err.stderr);
}
