import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-24f3ad28-43fa-4e4b-b0ee-f6e3fbdfeee3');

async function main() {
  console.log("Checking Firestore database...");
  try {
    const dailyLogsSnap = await getDocs(collection(db, 'dk_db_sync', 'dk_daily_logs', 'records'));
    console.log(`[Firestore Daily Logs]: Total documents found: ${dailyLogsSnap.size}`);
    
    const logs: any[] = [];
    dailyLogsSnap.forEach((docSnap) => {
      logs.push({ docId: docSnap.id, ...docSnap.data() });
    });

    console.log(`First 10 daily log entries:`);
    logs.slice(0, 10).forEach(l => {
      console.log(`Doc: ${l.docId} | Date: ${l.date} | Cat: ${l.category} | Content: ${l.content} | Assignee: ${l.assignee}`);
    });

    // Check for duplicates based on signature key
    const seenSignatures = new Map<string, any[]>();
    logs.forEach(log => {
      const content = String(log.content || '').trim().replace(/\s+/g, ' ');
      const date = String(log.date || '').trim();
      const category = String(log.category || 'IQC');
      const assignee = String(log.assignee || '').trim();
      const sigKey = `${date}|${category}|${assignee.toLowerCase()}|${content.toLowerCase()}`;
      if (!seenSignatures.has(sigKey)) {
        seenSignatures.set(sigKey, []);
      }
      seenSignatures.get(sigKey)!.push(log);
    });

    console.log(`Unique signatures: ${seenSignatures.size}`);
    let duplicateGroupsCount = 0;
    seenSignatures.forEach((group, key) => {
      if (group.length > 1) {
        duplicateGroupsCount++;
        if (duplicateGroupsCount <= 5) {
          console.log(`Duplicate group for [${key}]: count = ${group.length}`);
          group.forEach(g => {
            console.log(`  - Doc ID: ${g.docId}, STT: ${g.stt}, statusPercent: ${g.statusPercent}`);
          });
        }
      }
    });
    console.log(`Total duplicate groups: ${duplicateGroupsCount}`);

  } catch (err) {
    console.error("Error reading Firestore:", err);
  }
  process.exit(0);
}

main();
