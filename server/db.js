// Tiny JSON-file datastore (no native modules, so it runs on any Node host).
// Same tables as the old SQLite schema; each is an array of row objects.
import fs from 'node:fs';
import { DB_PATH } from './config.js';

const TABLES = ['users', 'streaks', 'materials', 'quizzes', 'attempts', 'chats'];

let data = null;
let saveTimer = null;

function load() {
  if (data) return data;
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    data = {};
  }
  TABLES.forEach((t) => {
    if (!Array.isArray(data[t])) data[t] = [];
  });
  return data;
}

function flush() {
  saveTimer = null;
  const tmp = DB_PATH + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Could not save datastore:', err.message);
  }
}

// Batch writes: many inserts in one request become one disk write
function save() {
  if (!saveTimer) saveTimer = setTimeout(flush, 50);
}

export function initDb() {
  load();
}

export function flushDb() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    flush();
  }
}

export function insert(table, row) {
  load()[table].push(row);
  save();
  return row;
}

export function findOne(table, pred) {
  return load()[table].find(pred) || null;
}

export function findAll(table, pred = () => true) {
  return load()[table].filter(pred);
}

export function update(table, pred, changes) {
  const row = findOne(table, pred);
  if (row) {
    Object.assign(row, changes);
    save();
  }
  return row;
}
