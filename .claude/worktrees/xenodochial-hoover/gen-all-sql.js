// Generate SQL for PT, onest, SV from inline data
// This script reads JSON files from asana-data/ and generates SQL

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

const dataDir = 'C:/Users/mitda/OneDrive/Desktop/kc-tasks/asana-data';

const projects = [
  { name: 'People Team', num: 16, prefix: 'people_team' },
  { name: 'onest Brand', num: 17, prefix: 'onest_brand' },
  { name: 'SV Biotech 2026', num: 18, prefix: 'sv_biotech_2026' },
];

let output = '';

for (const proj of projects) {
  const tasks = [];
  let page = 1;
  while (true) {
    const filePath = `${dataDir}/${proj.prefix}_page${page}.json`;
    if (!fs.existsSync(filePath)) break;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.data) {
      tasks.push(...data.data);
    } else if (Array.isArray(data)) {
      tasks.push(...data);
    }
    page++;
  }
  console.log(`${proj.name}: ${tasks.length} tasks loaded`);
  if (tasks.length > 0) {
    output += generateProjectSQL(proj.name, tasks, proj.num) + '\n';
  }
}

fs.writeFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/three-projects.sql', output);
console.log('SQL written to three-projects.sql');
