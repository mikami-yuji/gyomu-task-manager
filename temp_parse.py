
import xlrd
wb = xlrd.open_workbook(r'''C:\Users\asahi\Desktop\�t�H�[�}�b�g�i�b�b�q�p�j�F�u���i�[���⍇�����v�@�@�@�@�ŏI�X�V���F190117.xls''')
sheet = wb.sheet_by_index(0)
for r in range(sheet.nrows):
    row_vals = []
    for c in range(sheet.ncols):
        val = sheet.cell_value(r, c)
        if str(val).strip() != '':
            row_vals.append(f"R{r}C{c}: [{val}]")
    if row_vals:
        print(f"Row {r:2d}: " + " | ".join(row_vals))
