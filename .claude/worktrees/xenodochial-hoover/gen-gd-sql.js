// Generate SQL for Graphic Design project only, using existing page files
const fs = require('fs');

function escapeSQL(str) {
  if (!str) return '';
  str = str.replace(/[\n\r]+/g, ' ').replace(/\t/g, ' ').trim();
  str = str.replace(/'/g, "''");
  return str;
}

function getSection(task) {
  if (task.memberships && task.memberships.length > 0) {
    return task.memberships[task.memberships.length - 1].section.name || '';
  }
  return '';
}

function getPriority(task) {
  if (!task.custom_fields) return '';
  for (const cf of task.custom_fields) {
    if (cf.name === 'Priority' && cf.display_value) {
      const v = cf.display_value;
      if (v === 'High' || v === 'Medium' || v === 'Low') return v;
    }
  }
  return '';
}

function getProgress(task) {
  if (!task.custom_fields) {
    return task.completed ? 'Done' : '';
  }
  for (const cf of task.custom_fields) {
    if (cf.name === 'Task Progress' && cf.display_value) {
      return cf.display_value;
    }
  }
  return task.completed ? 'Done' : '';
}

const dataDir = 'C:/Users/mitda/OneDrive/Desktop/kc-tasks/asana-data';
const tasks = [];

for (let page = 1; page <= 20; page++) {
  const filePath = `${dataDir}/graphic_design_page${page}.json`;
  if (!fs.existsSync(filePath)) break;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  tasks.push(...data.data);
}

console.log(`Graphic Design: ${tasks.length} tasks loaded`);

let sql = '';
sql += `----------------------------------------------------------------------\n`;
sql += `-- Project 1: Graphic Design\n`;
sql += `----------------------------------------------------------------------\n`;
sql += `INSERT INTO public.projects (name, description, is_private, owner_id)\n`;
sql += `VALUES ('Graphic Design', '', false, uid) RETURNING id INTO pid;\n\n`;
sql += `INSERT INTO public.tasks (title, section, due, priority, progress, project_id, created_by, sort_order) VALUES\n`;

const lines = [];
tasks.forEach((task, i) => {
  const title = escapeSQL(task.name);
  const section = escapeSQL(getSection(task));
  const due = task.due_on ? `'${task.due_on}'` : 'NULL';
  const priority = getPriority(task);
  const progress = getProgress(task);
  const order = i + 1;
  lines.push(`('${title}', '${section}', ${due}, '${priority}', '${progress}', pid, uid, ${order})`);
});

sql += lines.join(',\n') + ';\n';

fs.writeFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/gd-tasks.sql', sql);
console.log('GD SQL written to gd-tasks.sql');
