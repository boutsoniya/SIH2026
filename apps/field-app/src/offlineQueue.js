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

export async function syncQueuedEvidence({ apiBase = '', role = 'OFFICER' } = {}) {
  const records = await listEvidence();
  const pending = records.filter((item) => ['QUEUED', 'FAILED'].includes(item.sync_status));
  const synced = [];
  const failed = [];

  for (const record of pending) {
    await updateEvidenceStatus(record.test_id, 'SYNCING');
    try {
      if (apiBase) {
        const url = apiBase.replace(/\/$/, '') + '/api/evidence/sync';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Role': role,
            'X-Operator-Id': record.operator_id || 'ANONYMOUS',
          },
          body: JSON.stringify(record),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(data.error || 'Evidence sync failed (HTTP ' + response.status + ')');
          error.status = response.status;
          throw error;
        }
        const updated = {
          ...record,
          sync_status: 'SYNCED',
          sync_receipt: data.receipt || record.sync_receipt || null,
          integrity_status: 'SYNCED',
          updated_at: new Date().toISOString(),
        };
        await saveEvidence(updated, updated.image_blob || null);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 180));
        await updateEvidenceStatus(record.test_id, 'SYNCED');
      }
      synced.push(record.test_id);
    } catch (error) {
      await updateEvidenceStatus(record.test_id, 'FAILED');
      failed.push({
        test_id: record.test_id,
        status: error?.status || null,
        error: error?.message || 'Evidence sync failed',
      });
    }
  }

  return { synced, failed, remaining: await queueCount() };
}

export function supportsOfflineStorage() {
  return typeof indexedDB !== 'undefined';
}
