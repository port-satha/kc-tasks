// Process Asana task JSON data and generate SQL INSERT statements
// Usage: collect all page JSON files per project, then run this script

const fs = require('fs');

function escapeSQL(str) {
  if (!str) return '';
  // Remove newlines, tabs
  str = str.replace(/[\n\r]+/g, ' ').replace(/\t/g, ' ').trim();
  // Escape single quotes by doubling them
  str = str.replace(/'/g, "''");
  return str;
}

function getSection(task) {
  if (task.memberships && task.memberships.length > 0) {
    // Use last membership's section (most specific to this project)
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
  // No explicit progress: completed = 'Done', incomplete = ''
  return task.completed ? 'Done' : '';
}

function generateProjectSQL(projectName, tasks, projectNum) {
  let sql = '';
  sql += `----------------------------------------------------------------------\n`;
  sql += `-- Project ${projectNum}: ${projectName}\n`;
  sql += `----------------------------------------------------------------------\n`;
  sql += `INSERT INTO public.projects (name, description, is_private, owner_id)\n`;
  sql += `VALUES ('${escapeSQL(projectName)}', '', false, uid) RETURNING id INTO pid;\n\n`;
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
  return sql;
}

// Read from data directory
const dataDir = 'C:/Users/mitda/OneDrive/Desktop/kc-tasks/asana-data';
const projects = [
  { name: 'Graphic Design', num: 1, files: [] },
  { name: 'People Team', num: 16, files: [] },
  { name: 'onest Brand', num: 17, files: [] },
  { name: 'SV Biotech 2026', num: 18, files: [] },
];

for (const proj of projects) {
  const prefix = proj.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  let page = 1;
  while (true) {
    const filePath = `${dataDir}/${prefix}_page${page}.json`;
    if (!fs.existsSync(filePath)) break;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    proj.files.push(...data.data);
    page++;
  }
  console.log(`${proj.name}: ${proj.files.length} tasks loaded`);
}

// Generate SQL for each project
let output = '';
for (const proj of projects) {
  if (proj.files.length > 0) {
    output += generateProjectSQL(proj.name, proj.files, proj.num) + '\n';
  }
}

fs.writeFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/additional-tasks.sql', output);
console.log('SQL written to additional-tasks.sql');
