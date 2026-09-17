const DB_NAME = 'narcoscope-field';
const DB_VERSION = 2;
const STORE = 'evidence';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'test_id' });
        store.createIndex('sync_status', 'sync_status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listEvidence() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    request.onerror = () => reject(request.error);
  });
}

export async function saveEvidence(record, imageBlob = null) {
  const db = await openDb();
  const next = {
    ...record,
    image_blob: imageBlob || record.image_blob || null,
    sync_status: record.sync_status || 'QUEUED',
    updated_at: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(next);
    tx.oncomplete = () => resolve(next);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEvidence(testId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(testId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function updateEvidenceStatus(testId, sync_status) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.get(testId);
    request.onsuccess = () => {
      if (!request.result) return reject(new Error('Evidence record not found'));
      store.put({ ...request.result, sync_status, updated_at: new Date().toISOString() });
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = async () => resolve((await listEvidence()).find((item) => item.test_id === testId));
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueCount() {
  const records = await listEvidence();
  return records.filter((item) => ['QUEUED', 'FAILED', 'SYNCING'].includes(item.sync_status)).length;
}

export async function syncQueuedEvidence() {
  const records = await listEvidence();
  const pending = records.filter((item) => ['QUEUED', 'FAILED'].includes(item.sync_status));
  const synced = [];

  for (const record of pending) {
    await updateEvidenceStatus(record.test_id, 'SYNCING');
    // Demo transport: no server endpoint exists yet. Keep this explicitly local.
    await new Promise((resolve) => setTimeout(resolve, 180));
    await updateEvidenceStatus(record.test_id, 'SYNCED');
    synced.push(record.test_id);
  }

  return { synced, remaining: await queueCount() };
}

export function supportsOfflineStorage() {
  return typeof indexedDB !== 'undefined';
}
