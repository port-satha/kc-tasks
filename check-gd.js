const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/asana-data/graphic_design_page1_fresh.json', 'utf8'));
console.log('Tasks:', d.data.length);
console.log('Has next:', d.next_page != null);
if (d.next_page) {
  console.log('Offset (first 80):', d.next_page.offset.substring(0, 80));
}
