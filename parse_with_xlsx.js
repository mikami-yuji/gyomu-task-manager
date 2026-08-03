const fs = require('fs');
const XLSX = require('xlsx');

const fullPath = 'c:\\gemini_cli\\業務課ツール\\target_format.xls';

console.log('Reading Excel File via xlsx:', fullPath);

const workbook = XLSX.readFile(fullPath);

let resultText = '';

workbook.SheetNames.forEach(sheetName => {
    resultText += `\n========================================\nSheet: ${sheetName}\n========================================\n`;
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
        let rowCells = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = worksheet[cell_ref];
            if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
                rowCells.push(`[${cell_ref}]: ${String(cell.v).replace(/\n/g, ' ')}`);
            }
        }
        if (rowCells.length > 0) {
            resultText += `Row ${R + 1}: ${rowCells.join(' | ')}\n`;
        }
    }
});

fs.writeFileSync('excel_structure.txt', resultText, 'utf8');
console.log('Successfully written to excel_structure.txt!');
