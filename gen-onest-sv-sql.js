// Generate SQL for onest Brand (257 tasks) and SV Biotech 2026 (365 tasks)
// Task data fetched from Asana API on 2026-04-02
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

// Read task data from JSON files
const onestData = JSON.parse(fs.readFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/onest-raw.json', 'utf8'));
const svData = JSON.parse(fs.readFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/sv-raw.json', 'utf8'));

console.log(`onest Brand: ${onestData.length} tasks`);
console.log(`SV Biotech 2026: ${svData.length} tasks`);

const onestSQL = generateProjectSQL('onest Brand', onestData, 17);
fs.writeFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/onest-tasks.sql', onestSQL);
console.log('onest SQL written to onest-tasks.sql');

const svSQL = generateProjectSQL('SV Biotech 2026', svData, 18);
fs.writeFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/sv-tasks.sql', svSQL);
console.log('SV SQL written to sv-tasks.sql');
