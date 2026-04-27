// Fetch all tasks from Asana for the 3 projects (PT, onest, SV) and generate SQL
// Uses the Asana API directly via the persisted tool result files approach
// Actually, this reads tasks from JSON files in asana-data/ directory

const fs = require('fs');
const https = require('https');

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

// Read data from stdin - expects JSON array of {project, num, tasks}
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const projects = JSON.parse(input);
  let output = '';
  for (const proj of projects) {
    console.log(`${proj.project}: ${proj.tasks.length} tasks`);
    output += generateProjectSQL(proj.project, proj.tasks, proj.num) + '\n';
  }
  fs.writeFileSync('C:/Users/mitda/OneDrive/Desktop/kc-tasks/three-projects.sql', output);
  console.log('SQL written to three-projects.sql');
});
