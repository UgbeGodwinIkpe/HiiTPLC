import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { jsonDb } from './src/data/jsonDb';
import {
  User,
  Course,
  Batch,
  StudentProfile,
  Question,
  Exam,
  ExamAttempt,
  AttendanceSession,
  EmailRecord
} from './src/types';
import {
  sendStudentCredentialsEmail,
  getSmtpConfig,
  testSmtpConnection
} from './server/emailDispatcher';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // ==========================================
  // DATABASE MANAGEMENT & PERSISTENCE APIs
  // ==========================================

  // Get live database file status, record counts, file sizes, and sync state
  app.get('/api/database/status', (req, res) => {
    try {
      const status = jsonDb.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to read database status.' });
    }
  });

  // Download entire database as a single structured JSON backup file
  app.get('/api/database/export', (req, res) => {
    try {
      const backup = jsonDb.exportFullDatabase();
      const dateStr = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="HiiT_Abuja_CBT_Database_${dateStr}.json"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to export database backup.' });
    }
  });

  // Import and restore database from uploaded JSON backup
  app.post('/api/database/import', (req, res) => {
    try {
      const backupData = req.body;
      const result = jsonDb.importFullDatabase(backupData);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to restore database from JSON file.' });
    }
  });

  // Create an on-demand timestamped JSON backup snapshot on disk
  app.post('/api/database/backup', (req, res) => {
    try {
      const snapshotPath = jsonDb.createBackupSnapshot('manual_snapshot');
      res.json({
        success: true,
        message: 'JSON database snapshot safely created on disk.',
        path: snapshotPath,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create backup snapshot.' });
    }
  });

  // ==========================================
  // AUTHENTICATION API
  // ==========================================
  app.post('/api/auth/login', (req, res) => {
    const { loginType, identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide credentials.' });
    }

    if (loginType === 'student') {
      const students = jsonDb.getStudents();
      const student = students.find(
        (s) =>
          s.regNumber.trim().toLowerCase() === identifier.trim().toLowerCase() ||
          s.email.trim().toLowerCase() === identifier.trim().toLowerCase()
      );

      if (!student) {
        return res.status(401).json({ error: 'Invalid Student Registration Number or Email.' });
      }

      // Check student password (defaults to 'student123' if not explicitly configured)
      const expectedPassword = student.password || 'student123';
      if (password !== expectedPassword) {
        return res.status(401).json({ error: 'Incorrect Student Password. Please try again or contact your administrator.' });
      }

      const userObj: User = {
        id: student.id,
        name: student.fullName,
        email: student.email,
        role: 'student',
        regNumber: student.regNumber,
        phone: student.phone,
        assignedCourseIds: [student.courseId],
        assignedBatchIds: [student.batchId],
        status: student.status,
        createdAt: student.registeredAt
      };

      jsonDb.addLog(userObj.id, userObj.name, 'student', 'USER_LOGIN', `Student logged in with Reg Number ${userObj.regNumber}`);
      return res.json({ user: userObj, token: `jwt_student_${student.id}` });
    } else {
      const users = jsonDb.getUsers();
      const user = users.find(
        (u) => u.email.trim().toLowerCase() === identifier.trim().toLowerCase()
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid Email address.' });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({ error: 'Your account has been deactivated. Contact Faculty Coordinator.' });
      }

      // Check staff/instructor password (defaults to 'hiit123' if not explicitly configured)
      const expectedPassword = user.password || 'hiit123';
      if (password !== expectedPassword) {
        return res.status(401).json({ error: 'Incorrect Password. Please check your credentials.' });
      }

      jsonDb.addLog(user.id, user.name, user.role, 'USER_LOGIN', `${user.role.toUpperCase()} logged in: ${user.email}`);
      return res.json({ user, token: `jwt_${user.role}_${user.id}` });
    }
  });

  // ==========================================
  // COURSES API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/courses', (req, res) => {
    res.json(jsonDb.getCourses());
  });

  app.post('/api/courses', (req, res) => {
    const { code, title, description, durationWeeks } = req.body;
    if (!code || !title) {
      return res.status(400).json({ error: 'Course code and title are required.' });
    }

    const courses = jsonDb.getCourses();
    const newCourse: Course = {
      id: `crs_${Date.now()}`,
      code,
      title,
      description: description || '',
      durationWeeks: Number(durationWeeks) || 12,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    courses.unshift(newCourse);
    jsonDb.saveCourses(courses);
    jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'COURSE_CREATED', `Added course ${code}: ${title}`);
    res.status(201).json(newCourse);
  });

  app.put('/api/courses/:id', (req, res) => {
    const { id } = req.params;
    const { code, title, description, durationWeeks } = req.body;

    const courses = jsonDb.getCourses();
    const courseIndex = courses.findIndex((c) => c.id === id);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    courses[courseIndex] = {
      ...courses[courseIndex],
      code: code || courses[courseIndex].code,
      title: title || courses[courseIndex].title,
      description: description !== undefined ? description : courses[courseIndex].description,
      durationWeeks: durationWeeks ? Number(durationWeeks) : courses[courseIndex].durationWeeks
    };

    jsonDb.saveCourses(courses);
    res.json(courses[courseIndex]);
  });

  app.delete('/api/courses/:id', (req, res) => {
    const { id } = req.params;
    let courses = jsonDb.getCourses();
    courses = courses.filter((c) => c.id !== id);
    jsonDb.saveCourses(courses);
    res.json({ success: true });
  });

  app.patch('/api/courses/:id/status', (req, res) => {
    const { id } = req.params;
    const courses = jsonDb.getCourses();
    const course = courses.find((c) => c.id === id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    course.status = course.status === 'active' ? 'inactive' : 'active';
    jsonDb.saveCourses(courses);
    res.json(course);
  });

  // ==========================================
  // INSTRUCTORS API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/instructors', (req, res) => {
    const users = jsonDb.getUsers();
    const instructors = users.filter((u) => u.role === 'instructor');
    res.json(instructors);
  });

  app.post('/api/instructors', (req, res) => {
    const { name, email, phone, password, assignedCourseIds, assignedBatchIds } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const users = jsonDb.getUsers();
    if (users.some((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: `An account with email ${email} already exists.` });
    }

    const newInst: User = {
      id: `usr_inst_${Date.now()}`,
      name,
      email,
      role: 'instructor',
      password: password && password.trim() ? password.trim() : 'hiit123',
      phone: phone || '',
      assignedCourseIds: assignedCourseIds || [],
      assignedBatchIds: assignedBatchIds || [],
      status: 'active',
      createdAt: new Date().toISOString()
    };

    users.unshift(newInst);
    jsonDb.saveUsers(users);
    jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'INSTRUCTOR_ADDED', `Added instructor: ${name} (${email})`);
    res.status(201).json(newInst);
  });

  app.put('/api/instructors/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone, password, assignedCourseIds, assignedBatchIds, status } = req.body;

    const users = jsonDb.getUsers();
    const idx = users.findIndex((u) => u.id === id && u.role === 'instructor');
    if (idx === -1) return res.status(404).json({ error: 'Instructor not found.' });

    users[idx] = {
      ...users[idx],
      name: name || users[idx].name,
      email: email || users[idx].email,
      phone: phone !== undefined ? phone : users[idx].phone,
      password: password && password.trim() ? password.trim() : users[idx].password || 'hiit123',
      assignedCourseIds: assignedCourseIds || users[idx].assignedCourseIds,
      assignedBatchIds: assignedBatchIds || users[idx].assignedBatchIds,
      status: status || users[idx].status
    };

    jsonDb.saveUsers(users);
    res.json(users[idx]);
  });

  app.post('/api/instructors/:id/reset-password', (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const users = jsonDb.getUsers();
    const inst = users.find((u) => u.id === id);
    if (!inst) return res.status(404).json({ error: 'Instructor not found.' });
    
    const assignedPass = newPassword && newPassword.trim() ? newPassword.trim() : `hiit${Math.floor(1000 + Math.random() * 9000)}`;
    inst.password = assignedPass;
    jsonDb.saveUsers(users);

    jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'PASSWORD_RESET', `Reset password for instructor ${inst.name}`);
    res.json({ message: `Password reset successfully for ${inst.name}. New password: ${assignedPass}`, password: assignedPass });
  });

  app.delete('/api/instructors/:id', (req, res) => {
    const { id } = req.params;
    let users = jsonDb.getUsers();
    users = users.filter((u) => u.id !== id);
    jsonDb.saveUsers(users);
    res.json({ success: true });
  });

  // ==========================================
  // BATCHES API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/batches', (req, res) => {
    const batches = jsonDb.getBatches();
    const students = jsonDb.getStudents();
    const batchesWithCount = batches.map((b) => ({
      ...b,
      studentCount: students.filter((s) => s.batchId === b.id).length
    }));
    res.json(batchesWithCount);
  });

  app.post('/api/batches', (req, res) => {
    const { name, courseId, instructorId, startDate, endDate } = req.body;
    if (!name || !courseId || !instructorId) {
      return res.status(400).json({ error: 'Batch Name, Course, and Instructor are required.' });
    }

    const courses = jsonDb.getCourses();
    const users = jsonDb.getUsers();
    const course = courses.find((c) => c.id === courseId);
    const instructor = users.find((u) => u.id === instructorId);

    const batches = jsonDb.getBatches();
    const newBatch: Batch = {
      id: `batch_${Date.now()}`,
      name,
      courseId,
      courseTitle: course ? course.title : 'General Course',
      instructorId,
      instructorName: instructor ? instructor.name : 'Unassigned',
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || '',
      status: 'active',
      studentCount: 0
    };

    batches.unshift(newBatch);
    jsonDb.saveBatches(batches);
    jsonDb.addLog(instructorId, instructor?.name || 'System', 'instructor', 'BATCH_CREATED', `Created batch ${name}`);
    res.status(201).json(newBatch);
  });

  app.put('/api/batches/:id', (req, res) => {
    const { id } = req.params;
    const { name, courseId, instructorId, startDate, endDate, status } = req.body;

    const batches = jsonDb.getBatches();
    const idx = batches.findIndex((b) => b.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Batch not found.' });

    const courses = jsonDb.getCourses();
    const users = jsonDb.getUsers();
    const course = courseId ? courses.find((c) => c.id === courseId) : null;
    const instructor = instructorId ? users.find((u) => u.id === instructorId) : null;

    batches[idx] = {
      ...batches[idx],
      name: name || batches[idx].name,
      courseId: courseId || batches[idx].courseId,
      courseTitle: course ? course.title : batches[idx].courseTitle,
      instructorId: instructorId || batches[idx].instructorId,
      instructorName: instructor ? instructor.name : batches[idx].instructorName,
      startDate: startDate || batches[idx].startDate,
      endDate: endDate || batches[idx].endDate,
      status: status || batches[idx].status
    };

    jsonDb.saveBatches(batches);
    res.json(batches[idx]);
  });

  app.patch('/api/batches/:id/close', (req, res) => {
    const { id } = req.params;
    const batches = jsonDb.getBatches();
    const batch = batches.find((b) => b.id === id);
    if (!batch) return res.status(404).json({ error: 'Batch not found.' });
    batch.status = batch.status === 'active' ? 'closed' : 'active';
    jsonDb.saveBatches(batches);
    res.json(batch);
  });

  app.delete('/api/batches/:id', (req, res) => {
    const { id } = req.params;
    let batches = jsonDb.getBatches();
    batches = batches.filter((b) => b.id !== id);
    jsonDb.saveBatches(batches);
    res.json({ success: true });
  });

  // ==========================================
  // STUDENTS API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/students', (req, res) => {
    const { batchId, courseId, query, instructorId } = req.query;
    let list = jsonDb.getStudents();

    if (instructorId) {
      const users = jsonDb.getUsers();
      const batches = jsonDb.getBatches();
      const inst = users.find((u) => u.id === instructorId);
      const instCourseIds = new Set([
        ...(inst?.assignedCourseIds || []),
        ...batches.filter((b) => b.instructorId === instructorId).map((b) => b.courseId)
      ]);
      const instBatchIds = new Set([
        ...(inst?.assignedBatchIds || []),
        ...batches.filter((b) => b.instructorId === instructorId).map((b) => b.id)
      ]);

      list = list.filter((s) => instCourseIds.has(s.courseId) || instBatchIds.has(s.batchId));
    }

    if (batchId) list = list.filter((s) => s.batchId === batchId);
    if (courseId) list = list.filter((s) => s.courseId === courseId);
    if (query) {
      const q = String(query).toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.regNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.includes(q)
      );
    }

    res.json(list);
  });

  app.post('/api/students', async (req, res) => {
    const { fullName, regNumber, email, phone, password, courseId, batchId, sendEmail, sendCredentialsEmail } = req.body;
    const shouldSendEmail = (sendEmail !== undefined ? sendEmail : sendCredentialsEmail) !== false;

    if (!fullName || !regNumber || !courseId || !batchId) {
      return res.status(400).json({ error: 'Full Name, Registration Number, Course, and Batch are required.' });
    }

    const students = jsonDb.getStudents();
    if (students.some((s) => s.regNumber.trim().toLowerCase() === regNumber.trim().toLowerCase())) {
      return res.status(400).json({ error: `Registration number ${regNumber} already exists in the system!` });
    }

    const courses = jsonDb.getCourses();
    const batches = jsonDb.getBatches();
    const course = courses.find((c) => c.id === courseId);
    const batch = batches.find((b) => b.id === batchId);

    const studentPassword = password && password.trim() ? password.trim() : 'student123';
    const studentEmail = email && email.trim() ? email.trim() : `${regNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@student.hiit.ng`;

    const newStudent: StudentProfile = {
      id: `usr_std_${Date.now()}`,
      fullName,
      regNumber,
      email: studentEmail,
      phone: phone || '',
      password: studentPassword,
      courseId,
      courseTitle: course ? course.title : '',
      batchId,
      batchName: batch ? batch.name : '',
      status: 'active',
      registeredAt: new Date().toISOString()
    };

    students.unshift(newStudent);
    jsonDb.saveStudents(students);
    jsonDb.addLog('usr_inst_1', 'Instructor', 'instructor', 'STUDENT_ADDED', `Enrolled student ${fullName} (${regNumber})`);

    let emailSent = false;
    let emailRecord: EmailRecord | null = null;
    if (shouldSendEmail) {
      try {
        emailRecord = await sendStudentCredentialsEmail(
          {
            studentId: newStudent.id,
            studentName: newStudent.fullName,
            regNumber: newStudent.regNumber,
            email: newStudent.email,
            password: studentPassword,
            courseTitle: newStudent.courseTitle,
            batchName: newStudent.batchName
          },
          'student_added'
        );
        emailSent = emailRecord.status === 'sent';
      } catch (err: any) {
        console.error('[Email Dispatch] Failed to send student credentials email:', err);
      }
    }

    res.status(201).json({
      ...newStudent,
      emailSent,
      emailRecord,
      emailStatus: emailRecord?.status || 'none',
      emailDeliveryMessage: emailRecord?.deliveryDetails || ''
    });
  });

  app.put('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, regNumber, email, phone, password, courseId, batchId, status } = req.body;

    const students = jsonDb.getStudents();
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Student not found.' });

    const courses = jsonDb.getCourses();
    const batches = jsonDb.getBatches();
    const course = courseId ? courses.find((c) => c.id === courseId) : null;
    const batch = batchId ? batches.find((b) => b.id === batchId) : null;

    students[idx] = {
      ...students[idx],
      fullName: fullName || students[idx].fullName,
      regNumber: regNumber || students[idx].regNumber,
      email: email || students[idx].email,
      phone: phone !== undefined ? phone : students[idx].phone,
      password: password && password.trim() ? password.trim() : students[idx].password || 'student123',
      courseId: courseId || students[idx].courseId,
      courseTitle: course ? course.title : students[idx].courseTitle,
      batchId: batchId || students[idx].batchId,
      batchName: batch ? batch.name : students[idx].batchName,
      status: status || students[idx].status
    };

    jsonDb.saveStudents(students);
    res.json(students[idx]);
  });

  app.post('/api/students/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword, sendEmail = true } = req.body;
    const students = jsonDb.getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const assignedPass = newPassword && newPassword.trim() ? newPassword.trim() : `student${Math.floor(100 + Math.random() * 900)}`;
    student.password = assignedPass;
    jsonDb.saveStudents(students);

    jsonDb.addLog('usr_inst_1', 'Instructor', 'instructor', 'STUDENT_PASSWORD_RESET', `Reset password for student ${student.fullName} (${student.regNumber})`);

    let emailSent = false;
    let emailRecord = null;
    if (sendEmail !== false) {
      try {
        emailRecord = await sendStudentCredentialsEmail(
          {
            studentId: student.id,
            studentName: student.fullName,
            regNumber: student.regNumber,
            email: student.email,
            password: assignedPass,
            courseTitle: student.courseTitle,
            batchName: student.batchName
          },
          'password_reset'
        );
        emailSent = true;
      } catch (err: any) {
        console.error('[Email Dispatch] Failed to send password reset email:', err);
      }
    }

    res.json({
      message: `Password reset successfully for ${student.fullName}. New password: ${assignedPass}`,
      password: assignedPass,
      emailSent,
      emailRecord
    });
  });

  // Re-dispatch login credentials email to a student at any time
  app.post('/api/students/:id/send-credentials-email', async (req, res) => {
    const { id } = req.params;
    const { customPassword } = req.body;
    const students = jsonDb.getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    if (customPassword && customPassword.trim()) {
      student.password = customPassword.trim();
      jsonDb.saveStudents(students);
    }

    const currentPass = student.password || 'student123';

    try {
      const emailRecord = await sendStudentCredentialsEmail(
        {
          studentId: student.id,
          studentName: student.fullName,
          regNumber: student.regNumber,
          email: student.email,
          password: currentPass,
          courseTitle: student.courseTitle,
          batchName: student.batchName
        },
        'manual_resend'
      );
      const isSent = emailRecord.status === 'sent';
      res.json({
        success: true,
        emailSent: isSent,
        message: isSent
          ? `Live credentials email successfully delivered to ${student.email} via SMTP.`
          : `Credentials email saved in Portal Outbox (SMTP not configured in local .env for live inbox delivery).`,
        emailRecord
      });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to dispatch email: ${err.message}` });
    }
  });

  app.post('/api/students/import', async (req, res) => {
    const { students: incomingList, sendEmail = true } = req.body;
    if (!Array.isArray(incomingList) || incomingList.length === 0) {
      return res.status(400).json({ error: 'Students array required.' });
    }

    const students = jsonDb.getStudents();
    const courses = jsonDb.getCourses();
    const batches = jsonDb.getBatches();
    let addedCount = 0;
    const newStudentsToEmail: StudentProfile[] = [];

    incomingList.forEach((s) => {
      if (s.fullName && s.regNumber) {
        if (!students.some((ex) => ex.regNumber.trim().toLowerCase() === s.regNumber.trim().toLowerCase())) {
          const course =
            courses.find(
              (c) =>
                c.id === s.courseId ||
                c.code.toLowerCase() === (s.courseId || '').toLowerCase() ||
                (s.courseCode && c.code.toLowerCase() === s.courseCode.toLowerCase())
            ) || courses[0];

          const batch =
            batches.find(
              (b) =>
                b.id === s.batchId ||
                b.name.toLowerCase() === (s.batchName || '').toLowerCase() ||
                (s.batchId && b.name.toLowerCase().includes(s.batchId.toLowerCase()))
            ) || batches[0];

          const assignedPassword = s.password && s.password.trim() ? s.password.trim() : 'student123';
          const studentProfile: StudentProfile = {
            id: `usr_std_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            fullName: s.fullName,
            regNumber: s.regNumber,
            email: s.email || `${s.regNumber.toLowerCase()}@student.hiit.ng`,
            phone: s.phone || '',
            password: assignedPassword,
            courseId: course ? course.id : 'crs_1',
            courseTitle: course ? `${course.code} - ${course.title}` : (s.courseTitle || 'General Course'),
            batchId: batch ? batch.id : 'batch_1',
            batchName: batch ? batch.name : (s.batchName || 'General Batch'),
            status: 'active',
            registeredAt: new Date().toISOString()
          };

          students.unshift(studentProfile);
          newStudentsToEmail.push(studentProfile);
          addedCount++;
        }
      }
    });

    jsonDb.saveStudents(students);
    jsonDb.addLog('usr_inst_1', 'Instructor', 'instructor', 'BULK_STUDENTS_IMPORTED', `Imported ${addedCount} student records to JSON storage`);

    // Dispatch welcome credentials email to imported students if enabled
    let emailsSentCount = 0;
    if (sendEmail !== false && newStudentsToEmail.length > 0) {
      for (const st of newStudentsToEmail) {
        try {
          await sendStudentCredentialsEmail(
            {
              studentId: st.id,
              studentName: st.fullName,
              regNumber: st.regNumber,
              email: st.email,
              password: st.password || 'student123',
              courseTitle: st.courseTitle,
              batchName: st.batchName
            },
            'bulk_imported'
          );
          emailsSentCount++;
        } catch (err) {
          console.error(`[Bulk Import Email] Failed for ${st.email}:`, err);
        }
      }
    }

    res.json({
      message: `Successfully imported ${addedCount} students. ${emailsSentCount > 0 ? `${emailsSentCount} credentials emails dispatched.` : ''}`,
      count: addedCount,
      emailsSentCount
    });
  });

  app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;
    let students = jsonDb.getStudents();
    students = students.filter((s) => s.id !== id);
    jsonDb.saveStudents(students);
    res.json({ success: true });
  });

  // ==========================================
  // EMAIL OUTBOX & NOTIFICATIONS APIs
  // ==========================================
  // Check live SMTP configuration and connection mode
  app.get('/api/emails/smtp-status', (req, res) => {
    try {
      const config = getSmtpConfig();
      res.json({
        isConfigured: config.isConfigured,
        smtpService: config.smtpService,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpFrom: config.smtpFrom,
        maskedUser: config.maskedUser,
        mode: config.isConfigured ? 'live_smtp' : 'internal_outbox',
        guidance: config.isConfigured
          ? `Ready to send live emails via ${config.isGmail ? 'Gmail' : config.smtpHost}.`
          : `SMTP is not configured in your .env file. Outgoing emails are stored in the local Portal Outbox (/data/emails.json). Set SMTP_USER and SMTP_PASS in .env to deliver live emails to real inboxes.`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check SMTP status.' });
    }
  });

  // Test sending a live verification email to any destination address
  app.post('/api/emails/test-smtp', async (req, res) => {
    const { targetEmail } = req.body;
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid target email address required.' });
    }

    try {
      const result = await testSmtpConnection(targetEmail.trim());
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'SMTP test execution failed.' });
    }
  });

  app.get('/api/emails', (req, res) => {
    try {
      const emails = jsonDb.getEmails();
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch email outbox.' });
    }
  });

  app.get('/api/emails/:id', (req, res) => {
    try {
      const emails = jsonDb.getEmails();
      const email = emails.find((e) => e.id === req.params.id);
      if (!email) return res.status(404).json({ error: 'Email record not found.' });
      res.json(email);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch email details.' });
    }
  });



  // ==========================================
  // QUESTION BANK API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/questions', (req, res) => {
    const { courseId, status, instructorId } = req.query;
    let list = jsonDb.getQuestions();

    if (courseId) list = list.filter((q) => q.courseId === courseId);
    if (status) list = list.filter((q) => q.status === status);
    if (instructorId) list = list.filter((q) => q.instructorId === instructorId);

    res.json(list);
  });

  app.post('/api/questions', (req, res) => {
    const {
      courseId,
      instructorId,
      instructorName,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks,
      difficulty,
      topic
    } = req.body;

    if (!courseId || !questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return res.status(400).json({ error: 'Question text, all 4 options, and correct answer are required.' });
    }

    const courses = jsonDb.getCourses();
    const course = courses.find((c) => c.id === courseId);

    const questions = jsonDb.getQuestions();
    const newQ: Question = {
      id: `q_${Date.now()}`,
      courseId,
      courseTitle: course ? course.title : 'General Course',
      instructorId: instructorId || 'usr_inst_1',
      instructorName: instructorName || 'Instructor',
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks: Number(marks) || 5,
      difficulty: difficulty || 'medium',
      topic: topic || 'General',
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    questions.unshift(newQ);
    jsonDb.saveQuestions(questions);
    res.status(201).json(newQ);
  });

  app.post('/api/questions/import', (req, res) => {
    const { questions: incoming } = req.body;
    if (!Array.isArray(incoming)) return res.status(400).json({ error: 'Questions array required.' });

    const questions = jsonDb.getQuestions();
    const courses = jsonDb.getCourses();
    let addedCount = 0;

    incoming.forEach((q) => {
      if (q.questionText && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswer) {
        const course = courses.find((c) => c.id === q.courseId) || courses[0];
        questions.unshift({
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          courseId: course ? course.id : 'crs_1',
          courseTitle: course ? course.title : 'Course',
          instructorId: q.instructorId || 'usr_inst_1',
          instructorName: q.instructorName || 'Instructor',
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer.toUpperCase() as any,
          marks: Number(q.marks) || 5,
          difficulty: q.difficulty || 'medium',
          topic: q.topic || 'Imported Topic',
          status: 'draft',
          createdAt: new Date().toISOString()
        });
        addedCount++;
      }
    });

    jsonDb.saveQuestions(questions);
    res.json({ message: `Successfully imported ${addedCount} questions into Question Bank.`, count: addedCount });
  });

  app.put('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    const questions = jsonDb.getQuestions();
    const idx = questions.findIndex((q) => q.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Question not found.' });

    questions[idx] = {
      ...questions[idx],
      ...req.body,
      status: req.body.status || 'draft'
    };

    jsonDb.saveQuestions(questions);
    res.json(questions[idx]);
  });

  app.post('/api/questions/:id/submit', (req, res) => {
    const { id } = req.params;
    const questions = jsonDb.getQuestions();
    const q = questions.find((item) => item.id === id);
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    q.status = 'pending';
    jsonDb.saveQuestions(questions);
    jsonDb.addLog(q.instructorId, q.instructorName, 'instructor', 'QUESTION_SUBMITTED', `Submitted question "${q.questionText.slice(0, 30)}..." for approval.`);
    res.json(q);
  });

  app.post('/api/questions/:id/review', (req, res) => {
    const { id } = req.params;
    const { action, reason } = req.body;
    const questions = jsonDb.getQuestions();
    const q = questions.find((item) => item.id === id);
    if (!q) return res.status(404).json({ error: 'Question not found.' });

    if (action === 'approve') {
      q.status = 'approved';
      jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'QUESTION_APPROVED', `Approved question "${q.questionText.slice(0, 30)}..."`);
    } else if (action === 'reject') {
      q.status = 'rejected';
      q.rejectionReason = reason || 'Does not meet standards.';
      jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'QUESTION_REJECTED', `Rejected question: ${reason}`);
    } else if (action === 'modification') {
      q.status = 'modification_requested';
      q.rejectionReason = reason || 'Please revise question wording or options.';
    }

    jsonDb.saveQuestions(questions);
    res.json(q);
  });

  app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    let questions = jsonDb.getQuestions();
    questions = questions.filter((q) => q.id !== id);
    jsonDb.saveQuestions(questions);
    res.json({ success: true });
  });

  // ==========================================
  // EXAMS API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/exams', (req, res) => {
    const { batchId, courseId, status } = req.query;
    let list = jsonDb.getExams();

    if (batchId) list = list.filter((e) => e.batchId === batchId);
    if (courseId) list = list.filter((e) => e.courseId === courseId);
    if (status) list = list.filter((e) => e.status === status);

    res.json(list);
  });

  app.post('/api/exams', (req, res) => {
    const {
      title,
      courseId,
      batchId,
      instructorId,
      instructorName,
      durationMinutes,
      passingScorePercent,
      instructions,
      questionIds,
      shuffleQuestions,
      shuffleOptions
    } = req.body;

    if (!title || !courseId || !batchId || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: 'Title, Course, Batch, and at least 1 Question are required.' });
    }

    const courses = jsonDb.getCourses();
    const batches = jsonDb.getBatches();
    const questions = jsonDb.getQuestions();

    const course = courses.find((c) => c.id === courseId);
    const batch = batches.find((b) => b.id === batchId);

    const selectedQuestions = questions.filter((q) => questionIds.includes(q.id));
    const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 5), 0);

    const exams = jsonDb.getExams();
    const newExam: Exam = {
      id: `ex_${Date.now()}`,
      title,
      courseId,
      courseTitle: course ? course.title : '',
      batchId,
      batchName: batch ? batch.name : '',
      instructorId: instructorId || 'usr_inst_1',
      instructorName: instructorName || 'Dr. Emmanuel Okafor',
      durationMinutes: Number(durationMinutes) || 15,
      passingScorePercent: Number(passingScorePercent) || 60,
      instructions: instructions || 'Read all questions carefully before submitting.',
      questionIds,
      totalMarks,
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    exams.unshift(newExam);
    jsonDb.saveExams(exams);
    jsonDb.addLog(newExam.instructorId, newExam.instructorName, 'instructor', 'EXAM_CREATED', `Created CBT Exam: "${title}" (Saved to JSON)`);
    res.status(201).json(newExam);
  });

  app.put('/api/exams/:id', (req, res) => {
    const { id } = req.params;
    const exams = jsonDb.getExams();
    const idx = exams.findIndex((e) => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found.' });

    const questions = jsonDb.getQuestions();
    const questionIds = req.body.questionIds || exams[idx].questionIds;
    const selectedQuestions = questions.filter((q) => questionIds.includes(q.id));
    const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 5), 0);

    exams[idx] = {
      ...exams[idx],
      ...req.body,
      totalMarks
    };

    jsonDb.saveExams(exams);
    res.json(exams[idx]);
  });

  app.post('/api/exams/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const exams = jsonDb.getExams();
    const exam = exams.find((e) => e.id === id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    exam.status = status;
    jsonDb.saveExams(exams);
    jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'EXAM_STATUS_UPDATED', `Exam "${exam.title}" status changed to ${status.toUpperCase()}`);
    res.json(exam);
  });

  app.delete('/api/exams/:id', (req, res) => {
    const { id } = req.params;
    let exams = jsonDb.getExams();
    exams = exams.filter((e) => e.id !== id);
    jsonDb.saveExams(exams);
    res.json({ success: true });
  });

  // ==========================================
  // ATTEMPTS & CBT ENGINE API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/attempts', (req, res) => {
    const { studentId, examId } = req.query;
    let list = jsonDb.getAttempts();

    if (studentId) list = list.filter((a) => a.studentId === studentId);
    if (examId) list = list.filter((a) => a.examId === examId);

    res.json(list);
  });

  app.post('/api/attempts/start', (req, res) => {
    const { examId, studentId } = req.body;
    if (!examId || !studentId) return res.status(400).json({ error: 'examId and studentId required.' });

    const exams = jsonDb.getExams();
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const students = jsonDb.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    const attempts = jsonDb.getAttempts();
    let existingAttempt = attempts.find(
      (a) => a.examId === examId && a.studentId === studentId && a.status === 'in_progress'
    );

    if (existingAttempt) {
      return res.json(existingAttempt);
    }

    const newAttempt: ExamAttempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      examId,
      examTitle: exam.title,
      studentId: student.id,
      studentRegNumber: student.regNumber,
      studentName: student.fullName,
      batchId: student.batchId,
      startTime: new Date().toISOString(),
      timeSpentSeconds: 0,
      status: 'in_progress',
      answers: {},
      flaggedQuestions: []
    };

    attempts.unshift(newAttempt);
    jsonDb.saveAttempts(attempts);
    jsonDb.addLog(student.id, student.fullName, 'student', 'EXAM_STARTED', `Started CBT exam "${exam.title}" (Recorded to JSON)`);
    res.status(201).json(newAttempt);
  });

  app.post('/api/attempts/:id/save', (req, res) => {
    const { id } = req.params;
    const { answers, timeSpentSeconds, flaggedQuestions } = req.body;

    const attempts = jsonDb.getAttempts();
    const attempt = attempts.find((a) => a.id === id);
    if (!attempt) return res.status(404).json({ error: 'Attempt session not found.' });

    if (attempt.status === 'submitted') {
      return res.status(400).json({ error: 'Exam attempt has already been submitted.' });
    }

    if (answers) attempt.answers = answers;
    if (timeSpentSeconds !== undefined) attempt.timeSpentSeconds = Number(timeSpentSeconds);
    if (flaggedQuestions) attempt.flaggedQuestions = flaggedQuestions;

    jsonDb.saveAttempts(attempts);
    res.json({ success: true, savedAt: new Date().toISOString() });
  });

  app.post('/api/attempts/:id/submit', (req, res) => {
    const { id } = req.params;
    const { answers, timeSpentSeconds } = req.body;

    const attempts = jsonDb.getAttempts();
    const attempt = attempts.find((a) => a.id === id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    const exams = jsonDb.getExams();
    const exam = exams.find((e) => e.id === attempt.examId);
    if (!exam) return res.status(404).json({ error: 'Associated exam not found.' });

    const finalAnswers = answers || attempt.answers;
    const finalTimeSpent = timeSpentSeconds !== undefined ? Number(timeSpentSeconds) : attempt.timeSpentSeconds;

    const questions = jsonDb.getQuestions();
    const examQuestions = questions.filter((q) => exam.questionIds.includes(q.id));
    let scoreObtained = 0;
    let totalPossible = 0;

    examQuestions.forEach((q) => {
      const qMarks = q.marks || 5;
      totalPossible += qMarks;

      const studentAns = finalAnswers[q.id];
      if (studentAns && studentAns.toUpperCase() === q.correctAnswer.toUpperCase()) {
        scoreObtained += qMarks;
      }
    });

    const percentage = totalPossible > 0 ? (scoreObtained / totalPossible) * 100 : 0;
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';
    else grade = 'F';

    const isPassed = percentage >= exam.passingScorePercent;

    attempt.answers = finalAnswers;
    attempt.timeSpentSeconds = finalTimeSpent;
    attempt.endTime = new Date().toISOString();
    attempt.status = 'submitted';
    attempt.scoreObtained = scoreObtained;
    attempt.totalMarksPossible = totalPossible;
    attempt.percentage = Math.round(percentage * 10) / 10;
    attempt.grade = grade;
    attempt.isPassed = isPassed;
    attempt.gradedAt = new Date().toISOString();

    jsonDb.saveAttempts(attempts);
    jsonDb.addLog(
      attempt.studentId,
      attempt.studentName,
      'student',
      'EXAM_SUBMITTED',
      `Completed CBT exam "${exam.title}". Score: ${attempt.percentage}% (${isPassed ? 'Passed' : 'Failed'}) - Persisted to attempts.json.`
    );

    res.json(attempt);
  });

  // ==========================================
  // SYSTEM STATS API
  // ==========================================
  app.get('/api/stats', (req, res) => {
    res.json(jsonDb.getStats());
  });

  // ==========================================
  // ATTENDANCE API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/attendance', (req, res) => {
    const { courseId, batchId, studentId, instructorId } = req.query;
    let list = jsonDb.getAttendance();

    if (courseId) list = list.filter((s) => s.courseId === courseId);
    if (batchId) list = list.filter((s) => s.batchId === batchId);
    if (instructorId) list = list.filter((s) => s.instructorId === instructorId);
    if (studentId) {
      list = list.filter((s) => s.records.some((r) => r.studentId === studentId));
    }

    res.json(list);
  });

  app.post('/api/attendance', (req, res) => {
    const { courseId, batchId, instructorId, instructorName, date, topic, records } = req.body;
    if (!courseId || !batchId || !date || !topic || !Array.isArray(records)) {
      return res.status(400).json({ error: 'courseId, batchId, date, topic, and records array are required.' });
    }

    const courses = jsonDb.getCourses();
    const batches = jsonDb.getBatches();
    const course = courses.find((c) => c.id === courseId);
    const batch = batches.find((b) => b.id === batchId);

    const attendance = jsonDb.getAttendance();
    const newSession: AttendanceSession = {
      id: `att_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      courseId,
      courseTitle: course ? course.title : 'Course',
      courseCode: course ? course.code : '',
      batchId,
      batchName: batch ? batch.name : 'Batch',
      instructorId: instructorId || 'usr_inst_1',
      instructorName: instructorName || 'Instructor',
      date,
      topic,
      records,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    attendance.unshift(newSession);
    jsonDb.saveAttendance(attendance);
    jsonDb.addLog(
      newSession.instructorId,
      newSession.instructorName,
      'instructor',
      'ATTENDANCE_MARKED',
      `Marked attendance for "${newSession.topic}" (${newSession.batchName}) - Persisted to attendance.json`
    );

    res.status(201).json(newSession);
  });

  app.put('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    const attendance = jsonDb.getAttendance();
    const idx = attendance.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Attendance session not found.' });

    attendance[idx] = {
      ...attendance[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    jsonDb.saveAttendance(attendance);
    jsonDb.addLog(
      attendance[idx].instructorId,
      attendance[idx].instructorName,
      'instructor',
      'ATTENDANCE_UPDATED',
      `Updated attendance record for "${attendance[idx].topic}"`
    );

    res.json(attendance[idx]);
  });

  app.delete('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    let attendance = jsonDb.getAttendance();
    attendance = attendance.filter((s) => s.id !== id);
    jsonDb.saveAttendance(attendance);
    res.json({ success: true });
  });

  // ==========================================
  // AUDIT LOGS API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/logs', (req, res) => {
    const logs = jsonDb.getLogs();
    res.json(logs.slice(0, 50));
  });

  // ==========================================
  // SETTINGS API (PERSISTENT JSON)
  // ==========================================
  app.get('/api/settings', (req, res) => {
    res.json(jsonDb.getSettings());
  });

  app.put('/api/settings', (req, res) => {
    const current = jsonDb.getSettings();
    const updated = { ...current, ...req.body };
    jsonDb.saveSettings(updated);
    jsonDb.addLog('usr_coord_1', 'Faculty Coordinator', 'coordinator', 'SETTINGS_UPDATED', `Updated system settings in settings.json.`);
    res.json(updated);
  });

  // ==========================================
  // RESET SEED DATA (WITH AUTO-BACKUP)
  // ==========================================
  app.post('/api/seed/reset', (req, res) => {
    jsonDb.resetToFactorySeed();
    res.json({ message: 'System JSON database files successfully reset to initial state! Pre-reset backup archived in /data/backups.' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/data/**/*', '**/data/*.json', '**/dist/**', '**/.git/**']
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HiiT CBT] Server running on http://0.0.0.0:${PORT} with Persistent JSON Storage Active`);
  });
}

startServer();
