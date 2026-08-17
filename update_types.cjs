const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'shared', 'types', 'database.types.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Insert client_po_no after order_item_no if not exists
if (!content.includes('client_po_no')) {
  content = content.replace(/(\s*)(order_item_no(\?)?: string \| null)/g, '$1client_po_no?: string | null$1$2');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated database.types.ts with client_po_no!');
} else {
  console.log('client_po_no already exists in database.types.ts');
}
