import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { MongoClient } from 'mongodb';
import { mkdirSync } from 'node:fs';
import { initialTasks, normalizeTasks } from '../src/model.js';
import { buildApp } from './build.mjs';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
const uri = process.env.MONGODB_URI;
let store;
if (uri) {
  const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
  const db = client.db('orbit_desk');
  const tasks = db.collection('tasks');
  await tasks.createIndex({ id: 1 }, { unique: true });
  if (!await db.collection('settings').findOne({ _id: 'initialized' })) {
    for (const task of initialTasks()) await tasks.updateOne({ id: task.id }, { $setOnInsert: task }, { upsert: true });
    await db.collection('settings').updateOne({ _id: 'initialized' }, { $set: { done: true } }, { upsert: true });
  }
  store = {
    list: () => tasks.find({}, { projection: { _id: 0 } }).toArray(),
    add: task => tasks.insertOne({ ...task }),
    update: async task => (await tasks.replaceOne({ id: task.id }, task)).matchedCount,
    remove: async id => (await tasks.deleteOne({ id })).deletedCount,
  };
} else {
  mkdirSync('data', { recursive: true });
  const db = new DatabaseSync(process.env.SQLITE_PATH || 'data/orbit.sqlite');
  db.exec('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY)');
  const insert = db.prepare('INSERT INTO tasks VALUES (?, ?)');
  if (!db.prepare("SELECT name FROM settings WHERE name='initialized'").get()) {
    db.exec('BEGIN');
    try {
      for (const task of initialTasks()) insert.run(task.id, JSON.stringify(task));
      db.exec("INSERT INTO settings VALUES ('initialized'); COMMIT");
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  store = {
    list: () => db.prepare('SELECT body FROM tasks ORDER BY rowid').all().map(row => JSON.parse(row.body)),
    add: task => insert.run(task.id, JSON.stringify(task)),
    update: task => db.prepare('UPDATE tasks SET body=? WHERE id=?').run(JSON.stringify(task), task.id).changes,
    remove: id => db.prepare('DELETE FROM tasks WHERE id=?').run(id).changes,
  };
}
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
function validated(res, data) {
  const task = validId(data?.id) && normalizeTasks([data])[0];
  if (!task) res.status(400).json({ error: 'Invalid task. Check the title, collection, priority and date.' });
  return task;
}
app.get('/api/tasks', async (_req, res) => res.set('Cache-Control','no-store').json(await store.list()));
app.post('/api/tasks', async (req, res) => {
  const task = validated(res, req.body);
  if (!task) return;
  await store.add(task);
  res.status(201).json(task);
});
app.put('/api/tasks/:id', async (req, res) => {
  const task = validated(res, { ...req.body, id: req.params.id });
  if (!task) return;
  if (!await store.update(task)) return res.status(404).json({error:'Task not found.'});
  res.json(task);
});
app.delete('/api/tasks/:id', async (req, res) => {
  if (!validId(req.params.id) || !await store.remove(req.params.id)) return res.status(404).json({error:'Task not found.'});
  res.status(204).end();
});
app.get('/health', (_req,res) => res.json({status:'ok', database:uri?'mongodb':'sqlite'}));
app.use('/api', (_req,res) => res.status(404).json({error:'Endpoint not found.'}));
app.use(express.static('dist'));
app.use((error,_req,res,_next) => {
  if (error.code === 11000 || error.errcode === 1555) return res.status(409).json({error:'Task already exists.'});
  if (error.status === 400 || error.status === 413) return res.status(error.status).json({error:'Invalid request body.'});
  console.error(error.message);
  res.status(500).json({ error: 'Could not save the task. Try again.' });
});
await buildApp();
const port = Number(process.env.PORT || 3003);
app.listen(port, '127.0.0.1', () => console.log('Orbit Desk: http://localhost:' + port));
