const DB_NAME = "sih-evidence-ledger";
const STORE = "records";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "test_id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueEvidence(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...record, sync_status: "PENDING", queued_at: new Date().toISOString() });
    tx.oncomplete = () => resolve(record.test_id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPendingEvidence() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter(x => x.sync_status !== "SYNCED"));
    req.onerror = () => reject(req.error);
  });
}

export async function markEvidenceSynced(testId, serverReceipt) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const get = store.get(testId);
    get.onsuccess = () => {
      const record = get.result;
      if (!record) return;
      store.put({ ...record, sync_status: "SYNCED", sync_receipt: serverReceipt, synced_at: new Date().toISOString() });
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
