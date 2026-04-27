// This script saves the Asana API response data as JSON files
// The data was fetched from Asana on 2026-04-02
const fs = require('fs');

// Helper to create minimal task objects from the API responses
function minTask(name, completed, due_on, memberships, custom_fields) {
  return { name, completed, due_on, memberships, custom_fields };
}
function s(name) { return [{ section: { name } }]; }
function cf(priority, progress) {
  const fields = [];
  fields.push({ name: 'Priority', display_value: priority || null });
  fields.push({ name: 'Task Progress', display_value: progress || null });
  return fields;
}

// Shorthand: t(name, completed, due_on, section, priority, progress)
function t(name, completed, due, section, priority, progress) {
  return minTask(name, completed, due, s(section), cf(priority, progress));
}

console.log('Building onest Brand tasks...');
const onest = [
