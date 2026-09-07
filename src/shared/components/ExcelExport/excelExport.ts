import * as XLSX from 'xlsx';

export const EXCEL_AVAILABLE_COLUMNS = [
  { id: 'part_no', label: '도번 (Drawing No)' },
  { id: 'part_name', label: '품명 (Part Name)' },
  { id: 'spec_w', label: '규격-가로/지름' },
  { id: 'spec_d', label: '규격-세로/길이' },
  { id: 'spec_h', label: '규격-두께' },
  { id: 'original_material_name', label: '원자재명' },
  { id: 'qty', label: '수량' },
  { id: 'unit_price', label: '단가' },
  { id: 'supply_price', label: '공급가액' },
  { id: 'process_time', label: '가공시간' },
  { id: 'work_days', label: '제작소요일' },
  { id: 'note', label: '비고' }
];

export const exportDataToExcel = (
  items: any[],
  columnIds: string[],
  fileName: string,
  estimate?: any
) => {
  // 1. Expand DYNAMIC_COLUMNS
  let expandedColumnIds: string[] = [];
  columnIds.forEach(id => {
    if (id === 'DYNAMIC_COLUMNS') {
      if (estimate?.custom_columns?.length > 0) {
        estimate.custom_columns.forEach((col: string) => {
          expandedColumnIds.push(`custom_${col}`);
        });
      }
    } else {
      expandedColumnIds.push(id);
    }
  });

  // 2. Resolve Column Definitions
  const selectedCols = expandedColumnIds.map(id => {
    if (id.startsWith('custom_') || id.startsWith('CUSTOM_')) {
      return { id, label: id.replace(/^custom_/i, '') };
    }
    return EXCEL_AVAILABLE_COLUMNS.find(c => c.id === id) || { id, label: id };
  });

  // 3. Create Header Row
  const headerRow = selectedCols.map(col => col.label);

  // 4. Create Data Rows
  const dataRows = items.map(item => {
    return selectedCols.map(col => {
      let value = item[col.id];
      
      // Look into custom_costs if it's a dynamic column
      if ((col.id.startsWith('custom_') || col.id.startsWith('CUSTOM_')) && item.custom_costs) {
        value = item.custom_costs[col.label];
      }
      
      // Keep number types intact, fallback to empty string
      return value !== undefined && value !== null ? value : '';
    });
  });

  // 4. 시트 데이터 구성 (헤더 + 데이터)
  const sheetData = [headerRow, ...dataRows];

  // 5. 워크시트 및 워크북 생성
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  
  // 열 너비 정도 지정
  const wscols = selectedCols.map(() => ({ wch: 15 })); // 기본 15글자 너비
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // 6. 엑셀 파일 다운로드 트리거
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
