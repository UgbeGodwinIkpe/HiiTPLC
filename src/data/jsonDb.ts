import fs from 'fs';
import path from 'path';
import { MongoClient, Db, Collection } from 'mongodb';
import { hashPassword } from '../../server/security';
import {
  User, Course, Batch, StudentProfile, Question, Exam, ExamAttempt,
  ActivityLog, SystemSettings, SystemStats, AttendanceSession, EmailRecord
} from '../types';
import {
  INITIAL_USERS, INITIAL_COURSES, INITIAL_BATCHES, INITIAL_STUDENTS,
  INITIAL_QUESTIONS, INITIAL_EXAMS, INITIAL_ATTEMPTS, INITIAL_LOGS,
  INITIAL_SETTINGS, INITIAL_ATTENDANCE_SESSIONS
} from './initialData';

type CollectionName = 'users'|'courses'|'batches'|'students'|'questions'|'exams'|'attempts'|'attendance'|'logs'|'emails';
const COLLECTIONS: CollectionName[] = ['users','courses','batches','students','questions','exams','attempts','attendance','logs','emails'];
const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export interface DatabaseFileMeta {
  fileName: string; collection: string; recordCount: number; sizeBytes: number; lastModified: string;
}
export interface DatabaseStatus {
  status: 'healthy'|'warning'|'error'; storageType: string; directory: string;
  lastSaved: string; totalRecords: number; totalSizeBytes: number; files: DatabaseFileMeta[];
}
export interface FullDatabaseBackup {
  meta: {system:string; centre:string; version:string; exportedAt:string; totalRecords:number};
  users:User[]; courses:Course[]; batches:Batch[]; students:StudentProfile[];
  questions:Question[]; exams:Exam[]; attempts:ExamAttempt[];
  attendance:AttendanceSession[]; logs:ActivityLog[]; settings:SystemSettings; emails?:EmailRecord[];
}

class MongoDatabaseManager {
  private client?: MongoClient;
  private db?: Db;
  private cache: Record<string, any[]> = {};
  private settings: SystemSettings = { ...INITIAL_SETTINGS };
  private pending = Promise.resolve();
  private lastSavedTimestamp = new Date().toISOString();
  private connected = false;

  async initialize() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is missing. Configure your MongoDB connection string in the environment.');
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 20 });
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'hiit_abuja_cbt');
    await this.db.command({ ping: 1 });
    const migrationState = this.db.collection('_system_migrations');
    for (const name of COLLECTIONS) {
      const collection = this.db.collection(name);
      await collection.createIndex({ id: 1 }, { unique: true, sparse: true });
      if (name === 'users') await collection.createIndex({ email: 1 });
      if (name === 'students') { await collection.createIndex({ regNumber: 1 }); await collection.createIndex({ email: 1 }); }
      if (name === 'exams') await collection.createIndex({ batchId: 1, status: 1 });
      if (name === 'attempts') { await collection.createIndex({ studentId: 1, examId: 1 }); await collection.createIndex({ status: 1 }); }
      let docs = await collection.find({}, { projection: { _id: 0 } }).toArray();
      const migrationKey = `legacy-json-${name}-v1`;
      const migrationDone = await migrationState.findOne({ _id: migrationKey });
      // Import or seed only once. A deliberately emptied collection must stay empty on later restarts.
      if (!docs.length && !migrationDone) {
        const legacyPath = path.join(DATA_DIR, `${name}.json`);
        if (fs.existsSync(legacyPath)) {
          try {
            const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
            if (Array.isArray(legacy) && legacy.length) {
              docs = legacy;
              await collection.insertMany(docs.map((item:any) => ({...item})), { ordered: false });
              console.log(`[MongoDB] Migrated ${docs.length} ${name} records from legacy JSON.`);
            }
          } catch (error) {
            console.warn(`[MongoDB] Could not migrate ${legacyPath}:`, error);
          }
        }
      }
      if (!docs.length) {
        const seeds: Record<string, any[]> = {
          users: INITIAL_USERS, courses: INITIAL_COURSES, batches: INITIAL_BATCHES,
          students: INITIAL_STUDENTS, questions: INITIAL_QUESTIONS, exams: INITIAL_EXAMS,
          attempts: INITIAL_ATTEMPTS, attendance: INITIAL_ATTENDANCE_SESSIONS, logs: INITIAL_LOGS, emails: []
        };
        docs = seeds[name] || [];
        if (docs.length) await collection.insertMany(docs.map((item:any) => ({...item})));
      }
      if (!migrationDone) await migrationState.insertOne({ _id: migrationKey, completedAt: new Date() });
      this.cache[name] = docs;
    }
    // Remove previously persisted plaintext credentials from email history as well.
    for (const emailRecord of (this.cache.emails || [])) {
      if (typeof emailRecord.passwordSent === 'string' && emailRecord.passwordSent) {
        const leakedPassword = emailRecord.passwordSent;
        for (const field of ['preview', 'htmlContent', 'textContent']) {
          if (typeof emailRecord[field] === 'string') emailRecord[field] = emailRecord[field].split(leakedPassword).join('[password hidden]');
        }
        delete emailRecord.passwordSent;
        await this.collection('emails').replaceOne({ id: emailRecord.id }, emailRecord);
      }
    }

    // Upgrade legacy plaintext credentials at rest before the API starts serving requests.
    for (const collectionName of ['users', 'students'] as const) {
      const records = this.cache[collectionName] || [];
      for (const record of records) {
        if (typeof record.password === 'string' && !record.password.startsWith('scrypt$')) {
          record.password = hashPassword(record.password);
          await this.collection(collectionName).updateOne({ id: record.id }, { $set: { password: record.password } });
        }
      }
    }

    const settingsCollection = this.db.collection('settings');
    const storedSettings = await settingsCollection.findOne({ _id: 'singleton' });
    if (storedSettings?.value) this.settings = storedSettings.value as SystemSettings;
    else {
      const legacySettings = path.join(DATA_DIR, 'settings.json');
      if (fs.existsSync(legacySettings)) {
        try { this.settings = JSON.parse(fs.readFileSync(legacySettings,'utf8')); } catch {}
      }
      await settingsCollection.replaceOne({_id:'singleton'}, {_id:'singleton', value:this.settings}, {upsert:true});
    }
    this.connected = true;
    this.lastSavedTimestamp = new Date().toISOString();
    console.log(`[MongoDB] Connected to database "${this.db.databaseName}"`);
  }

  private collection(name: string): Collection {
    if (!this.db) throw new Error('MongoDB is not initialized.');
    return this.db.collection(name);
  }
  private enqueue(task: () => Promise<void>) {
    this.pending = this.pending.catch(() => undefined).then(task).then(() => {
      this.lastSavedTimestamp = new Date().toISOString();
    });
    this.pending.catch(err => console.error('[MongoDB] Persistence error:', err));
  }
  async flush() { await this.pending; }
  private get<T>(name: CollectionName): T[] { return (this.cache[name] || []) as T[]; }
  private save<T extends {id?:string}>(name: CollectionName, rows: T[]) {
    // Keep the legacy synchronous service interface while persisting only changed records.
    // This avoids replacing every document on each small update and prevents unrelated
    // records from being rewritten on every request.
    const previous = (this.cache[name] || []) as T[];
    const next = rows.map(row => ({ ...row }));
    const previousById = new Map(previous.filter(row => row.id).map(row => [row.id!, row]));
    const nextById = new Map(next.filter(row => row.id).map(row => [row.id!, row]));
    const changed = next.filter(row => !row.id || JSON.stringify(previousById.get(row.id)) !== JSON.stringify(row));
    const removedIds = previous.filter(row => row.id && !nextById.has(row.id)).map(row => row.id);
    this.cache[name] = next as any[];
    this.enqueue(async () => {
      const col = this.collection(name);
      if (changed.length) {
        await col.bulkWrite(changed.filter(row => row.id).map((doc:any) => ({
          replaceOne: { filter: { id: doc.id }, replacement: doc, upsert: true }
        })), { ordered: false });
      }
      if (removedIds.length) await col.deleteMany({ id: { $in: removedIds } });
    });
  }

  getUsers=()=>this.get<User>('users'); saveUsers=(v:User[])=>this.save('users',v);
  getCourses=()=>this.get<Course>('courses'); saveCourses=(v:Course[])=>this.save('courses',v);
  getBatches=()=>this.get<Batch>('batches'); saveBatches=(v:Batch[])=>this.save('batches',v);
  getStudents=()=>this.get<StudentProfile>('students'); saveStudents=(v:StudentProfile[])=>this.save('students',v);
  getQuestions=()=>this.get<Question>('questions'); saveQuestions=(v:Question[])=>this.save('questions',v);
  getExams=()=>this.get<Exam>('exams'); saveExams=(v:Exam[])=>this.save('exams',v);
  getAttempts=()=>this.get<ExamAttempt>('attempts'); saveAttempts=(v:ExamAttempt[])=>this.save('attempts',v);
  getAttendance=()=>this.get<AttendanceSession>('attendance'); saveAttendance=(v:AttendanceSession[])=>this.save('attendance',v);
  getLogs=()=>this.get<ActivityLog>('logs'); saveLogs=(v:ActivityLog[])=>this.save('logs',v);
  getEmails=()=>this.get<EmailRecord>('emails'); saveEmails=(v:EmailRecord[])=>this.save('emails',v);
  getSettings=()=>this.settings;
  saveSettings=(value:SystemSettings)=>{ this.settings=value; this.enqueue(async()=>{await this.collection('settings').replaceOne({_id:'singleton'},{_id:'singleton',value},{upsert:true});}); };

  addLog(userId:string,userName:string,userRole:any,action:string,details:string):ActivityLog {
    const logs=this.getLogs();
    const item:ActivityLog={id:`log_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,userId,userName,userRole,action,details,timestamp:new Date().toISOString()};
    this.saveLogs([item,...logs].slice(0,200)); return item;
  }
  addEmail(data:Omit<EmailRecord,'id'|'sentAt'>):EmailRecord {
    const item:EmailRecord={...data,id:`mail_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,sentAt:new Date().toISOString()};
    this.saveEmails([item,...this.getEmails()].slice(0,500)); return item;
  }
  getStats():SystemStats {
    const courses=this.getCourses(), students=this.getStudents(), users=this.getUsers(), batches=this.getBatches(), exams=this.getExams(), questions=this.getQuestions(), attempts=this.getAttempts();
    const submitted=attempts.filter(a=>a.status==='submitted'), passed=submitted.filter(a=>a.isPassed).length, failed=submitted.length-passed;
    return {totalCourses:courses.filter(c=>c.status==='active').length,totalStudents:students.length,totalInstructors:users.filter(u=>u.role==='instructor'&&u.status==='active').length,totalBatches:batches.length,pendingExams:exams.filter(e=>e.status==='pending').length,approvedExams:exams.filter(e=>e.status==='approved').length,completedExams:exams.filter(e=>e.status==='published'||e.status==='completed').length,passRatePercent:submitted.length?Math.round(passed/submitted.length*100):0,failRatePercent:submitted.length?Math.round(failed/submitted.length*100):0,totalQuestions:questions.length};
  }
  getStatus():DatabaseStatus {
    const names:Record<string,string>={users:'System Users',courses:'Courses',batches:'Batches',students:'Students',questions:'Question Bank',exams:'CBT Exams',attempts:'Exam Attempts & Results',attendance:'Class Attendance Sessions',logs:'Audit Activity Logs',emails:'Email Notifications'};
    const files: DatabaseFileMeta[]=COLLECTIONS.map(name=>({fileName:name,collection:names[name],recordCount:(this.cache[name]||[]).length,sizeBytes:0,lastModified:this.lastSavedTimestamp}));
    files.push({fileName:'settings',collection:'System Settings',recordCount:1,sizeBytes:0,lastModified:this.lastSavedTimestamp});
    return {status:this.connected?'healthy':'error',storageType:'MongoDB Atlas',directory:this.db?.databaseName||'',lastSaved:this.lastSavedTimestamp,totalRecords:files.reduce((n,f)=>n+f.recordCount,0),totalSizeBytes:0,files};
  }
  exportFullDatabase():FullDatabaseBackup {
    const users=this.getUsers(),courses=this.getCourses(),batches=this.getBatches(),students=this.getStudents(),questions=this.getQuestions(),exams=this.getExams(),attempts=this.getAttempts(),attendance=this.getAttendance(),logs=this.getLogs(),emails=this.getEmails();
    return {meta:{system:'HiiT CBT Assessment & Management System',centre:'Abuja Training Centre',version:'3.0.0',exportedAt:new Date().toISOString(),totalRecords:users.length+courses.length+batches.length+students.length+questions.length+exams.length+attempts.length+attendance.length+logs.length+emails.length},users,courses,batches,students,questions,exams,attempts,attendance,logs,settings:this.settings,emails};
  }
  importFullDatabase(backup:any):{success:boolean;message:string;count:number} {
    if(!backup||typeof backup!=='object') throw new Error('Invalid backup file format.');
    let count=0;
    const mappings:any={users:'users',courses:'courses',batches:'batches',students:'students',questions:'questions',exams:'exams',attempts:'attempts',attendance:'attendance',logs:'logs',emails:'emails'};
    for(const [key,name] of Object.entries(mappings)) if(Array.isArray(backup[key])) {
      const records = backup[key].map((record:any) => ({ ...record }));
      if (key === 'users' || key === 'students') {
        for (const record of records) if (typeof record.password === 'string' && !record.password.startsWith('scrypt$')) record.password = hashPassword(record.password);
      }
      this.save(name as CollectionName,records);count+=records.length;
    }
    if(backup.settings&&typeof backup.settings==='object') this.saveSettings(backup.settings);
    this.addLog('system','System Database Manager','coordinator','DATABASE_RESTORED',`Restored ${count} records from backup.`);
    return {success:true,message:`Successfully restored ${count} records across MongoDB collections.`,count};
  }
  createBackupSnapshot(prefix='hiit_backup'):string {
    fs.mkdirSync(BACKUPS_DIR,{recursive:true});
    const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
    const file=path.join(BACKUPS_DIR,`${prefix}_${timestamp}.json`);
    fs.writeFileSync(file,JSON.stringify(this.exportFullDatabase(),null,2),'utf8');
    return file;
  }
  resetToFactorySeed():void {
    this.createBackupSnapshot('pre_reset_snapshot');
    this.saveUsers(INITIAL_USERS.map(user => ({ ...user, password: user.password ? hashPassword(user.password) : undefined })));this.saveCourses([...INITIAL_COURSES]);this.saveBatches([...INITIAL_BATCHES]);this.saveStudents(INITIAL_STUDENTS.map(student => ({ ...student, password: student.password ? hashPassword(student.password) : undefined })));this.saveQuestions([...INITIAL_QUESTIONS]);this.saveExams([...INITIAL_EXAMS]);this.saveAttempts([...INITIAL_ATTEMPTS]);this.saveAttendance([...INITIAL_ATTENDANCE_SESSIONS]);this.saveLogs([...INITIAL_LOGS]);this.saveSettings({...INITIAL_SETTINGS});
    this.addLog('system','System Database Manager','coordinator','DATABASE_RESET','MongoDB collections reset to factory seed data.');
  }
}
export const jsonDb = new MongoDatabaseManager();
