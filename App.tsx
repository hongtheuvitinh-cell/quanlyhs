/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, ViolationRecord, WeeklyPlan, StudentTask, SheetSyncConfig, ViolationType, Teacher, SchoolYear, ClassItem, AcademicUpdate, SystemUser } from './types';
import { initialStudents, initialViolations, initialWeeklyPlans, initialTasks, initialViolationTypes, initialAcademicUpdates, initialUsers } from './data/initialData';
import StudentManager from './components/StudentManager';
import DiligenceManager from './components/DiligenceManager';
import WeeklyPlanner from './components/WeeklyPlanner';
import TaskManager from './components/TaskManager';
import AcademicManager from './components/AcademicManager';
import SystemSettings from './components/SystemSettings';
import ClassManager from './components/ClassManager';
import PublicPortal from './components/PublicPortal';
import NewsManager from './components/NewsManager';

// Firebase Database imports
import { db, onSnapshot, collection } from './lib/firebase';
import * as dbService from './lib/dbService';

// Icons
import { 
  Users, 
  ShieldAlert, 
  Calendar, 
  CheckCircle, 
  Database, 
  TrendingUp, 
  Settings, 
  Sparkles, 
  BookOpen, 
  Search,
  UserCheck,
  AlertTriangle,
  LogOut,
  RefreshCw,
  HelpCircle,
  Grid,
  Lock,
  Unlock
} from 'lucide-react';

// Relational Migration Utility
const migrateToRelational = (
  storedStudents: any[],
  storedViolations: any[],
  storedPlans: any[],
  storedTasks: any[],
  storedClassesList: string[],
  storedSchoolYearsList: string[],
  storedTeacherName: string,
  storedClassName: string,
  storedSchoolYear: string
) => {
  // 1. Recreate teachers list
  const initialTeachers: Teacher[] = [
    { id: 'GV01', name: storedTeacherName || 'Cô Nguyễn Tuyết Mai' },
    { id: 'GV02', name: 'Thầy Lê Văn Tám' },
    { id: 'GV03', name: 'Cô Trần Thị Hồng' }
  ];
  
  // 2. Recreate school years
  const initialYears: SchoolYear[] = (storedSchoolYearsList && storedSchoolYearsList.length > 0)
    ? storedSchoolYearsList.map((y, index) => ({ id: `NH0${index + 1}`, name: y }))
    : [
        { id: 'NH01', name: '2024-2025' },
        { id: 'NH02', name: '2025-2026' },
        { id: 'NH03', name: '2026-2027' }
      ];
  
  const getYearIdByName = (name: string) => {
    const found = initialYears.find(y => y.name === name);
    return found ? found.id : (initialYears[0]?.id || 'NH02');
  };

  // 3. Recreate classes linked to years and teachers
  const initialClasses: ClassItem[] = [];
  const classNames = (storedClassesList && storedClassesList.length > 0)
    ? storedClassesList
    : ['Lớp 11A1', 'Lớp 11A2', 'Lớp 10A1'];

  classNames.forEach((cName, index) => {
    initialYears.forEach((y) => {
      // Create a class linked to that year
      initialClasses.push({
        id: `LH_${cName.replace(/\s+/g, '')}_${y.name.replace('-', '_')}`,
        name: cName,
        schoolYearId: y.id,
        teacherId: cName === storedClassName && y.name === storedSchoolYear ? 'GV01' : `GV0${(index % 2) + 2}`
      });
    });
  });

  const normalizeClassName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/^(lop|class)\s*/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const getClassIdByNames = (cNameStr: string, yNameStr: string) => {
    const normSearch = normalizeClassName(cNameStr);
    const found = initialClasses.find(c => 
      normalizeClassName(c.name) === normSearch && 
      c.schoolYearId === getYearIdByName(yNameStr)
    );
    return found ? found.id : (initialClasses[0]?.id || 'LH_Lop11A1_2025_2026');
  };

  // 4. Migrate students
  const migratedStudents: Student[] = storedStudents.map((s) => {
    const resolvedClassId = s.className 
      ? getClassIdByNames(s.className, s.schoolYear || storedSchoolYear || '2025-2026')
      : (s.classId || getClassIdByNames(storedClassName || 'Lớp 11A1', storedSchoolYear || '2025-2026'));
    const classItem = initialClasses.find(c => c.id === resolvedClassId);
    return {
      ...s,
      classId: resolvedClassId,
      className: classItem ? classItem.name : (s.className || storedClassName || 'Lớp 11A1'),
      schoolYear: s.schoolYear || storedSchoolYear || '2025-2026'
    };
  });

  // 5. Migrate violations
  const migratedViolations: ViolationRecord[] = storedViolations.map((v) => {
    const resolvedClassId = v.className 
      ? getClassIdByNames(v.className, v.schoolYear || storedSchoolYear || '2025-2026')
      : (v.classId || getClassIdByNames(storedClassName || 'Lớp 11A1', storedSchoolYear || '2025-2026'));
    const classItem = initialClasses.find(c => c.id === resolvedClassId);
    return {
      ...v,
      classId: resolvedClassId,
      className: classItem ? classItem.name : (v.className || storedClassName || 'Lớp 11A1'),
      schoolYear: v.schoolYear || storedSchoolYear || '2025-2026'
    };
  });

  // 6. Migrate plans
  const migratedPlans: WeeklyPlan[] = storedPlans.map((p) => {
    const resolvedClassId = p.className 
      ? getClassIdByNames(p.className, p.schoolYear || storedSchoolYear || '2025-2026')
      : (p.classId || getClassIdByNames(storedClassName || 'Lớp 11A1', storedSchoolYear || '2025-2026'));
    const classItem = initialClasses.find(c => c.id === resolvedClassId);
    return {
      ...p,
      classId: resolvedClassId,
      className: classItem ? classItem.name : (p.className || storedClassName || 'Lớp 11A1'),
      schoolYear: p.schoolYear || storedSchoolYear || '2025-2026'
    };
  });

  // 7. Migrate tasks
  const migratedTasks: StudentTask[] = storedTasks.map((t) => {
    const resolvedClassId = t.className 
      ? getClassIdByNames(t.className, t.schoolYear || storedSchoolYear || '2025-2026')
      : (t.classId || getClassIdByNames(storedClassName || 'Lớp 11A1', storedSchoolYear || '2025-2026'));
    const classItem = initialClasses.find(c => c.id === resolvedClassId);
    return {
      ...t,
      classId: resolvedClassId,
      className: classItem ? classItem.name : (t.className || storedClassName || 'Lớp 11A1'),
      schoolYear: t.schoolYear || storedSchoolYear || '2025-2026'
    };
  });

  const activeYearId = getYearIdByName(storedSchoolYear || '2025-2026');
  const activeCId = getClassIdByNames(storedClassName || 'Lớp 11A1', storedSchoolYear || '2025-2026');

  return {
    teachers: initialTeachers,
    schoolYears: initialYears,
    classes: initialClasses,
    students: migratedStudents,
    violations: migratedViolations,
    plans: migratedPlans,
    tasks: migratedTasks,
    activeSchoolYearId: activeYearId,
    activeClassId: activeCId
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'diligence' | 'academic' | 'class' | 'plans' | 'tasks' | 'settings' | 'news'>('overview');

  // Load and Migrate on mount
  const migrationResult = (() => {
    const rawStudentsStr = localStorage.getItem('app_students');
    const rawStudents = rawStudentsStr ? JSON.parse(rawStudentsStr) : initialStudents;

    const rawViolationsStr = localStorage.getItem('app_violations');
    const rawViolations = rawViolationsStr ? JSON.parse(rawViolationsStr) : initialViolations;

    const rawPlansStr = localStorage.getItem('app_plans');
    const rawPlans = rawPlansStr ? JSON.parse(rawPlansStr) : initialWeeklyPlans;

    const rawTasksStr = localStorage.getItem('app_tasks');
    const rawTasks = rawTasksStr ? JSON.parse(rawTasksStr) : initialTasks;

    const storedTeacherName = localStorage.getItem('teacherName') || 'Cô Nguyễn Tuyết Mai';
    const storedClassName = localStorage.getItem('className') || 'Lớp 11A1';
    const storedSchoolYear = localStorage.getItem('schoolYear') || '2025-2026';

    const rawClassesListStr = localStorage.getItem('app_classes_list');
    const rawClassesList = rawClassesListStr ? JSON.parse(rawClassesListStr) : ['Lớp 11A1', 'Lớp 11A2', 'Lớp 10A1'];

    const rawYearsListStr = localStorage.getItem('app_school_years_list');
    const rawYearsList = rawYearsListStr ? JSON.parse(rawYearsListStr) : ['2024-2025', '2025-2026', '2026-2027'];

    return migrateToRelational(
      rawStudents,
      rawViolations,
      rawPlans,
      rawTasks,
      rawClassesList,
      rawYearsList,
      storedTeacherName,
      storedClassName,
      storedSchoolYear
    );
  })();

  // Core Relational States
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('app_teachers_relational');
    return saved ? JSON.parse(saved) : migrationResult.teachers;
  });

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>(() => {
    const saved = localStorage.getItem('app_school_years_relational');
    return saved ? JSON.parse(saved) : migrationResult.schoolYears;
  });

  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const saved = localStorage.getItem('app_classes_relational');
    return saved ? JSON.parse(saved) : migrationResult.classes;
  });

  const [activeSchoolYearId, setActiveSchoolYearId] = useState<string>(() => {
    return localStorage.getItem('app_active_year_id_relational') || migrationResult.activeSchoolYearId;
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    return localStorage.getItem('app_active_class_id_relational') || migrationResult.activeClassId;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('app_students_relational');
    return saved ? JSON.parse(saved) : migrationResult.students;
  });

  const [violations, setViolations] = useState<ViolationRecord[]>(() => {
    const saved = localStorage.getItem('app_violations_relational');
    return saved ? JSON.parse(saved) : migrationResult.violations;
  });

  const [violationTypes, setViolationTypes] = useState<ViolationType[]>(() => {
    const saved = localStorage.getItem('app_violation_types');
    return saved ? JSON.parse(saved) : initialViolationTypes;
  });

  const [plans, setPlans] = useState<WeeklyPlan[]>(() => {
    const saved = localStorage.getItem('app_plans_relational');
    return saved ? JSON.parse(saved) : migrationResult.plans;
  });

  const [tasks, setTasks] = useState<StudentTask[]>(() => {
    const saved = localStorage.getItem('app_tasks_relational');
    return saved ? JSON.parse(saved) : migrationResult.tasks;
  });

  const [academicUpdates, setAcademicUpdates] = useState<AcademicUpdate[]>(() => {
    const saved = localStorage.getItem('app_academic_updates');
    return saved ? JSON.parse(saved) : initialAcademicUpdates;
  });

  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem('app_admin_pin') || '1234';
  });

  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem('app_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('app_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const userRole = 'teacher';
  const isPinModalOpen = false;
  const pinInput = '';
  const pinError = '';

  const [config, setConfig] = useState<SheetSyncConfig>(() => {
    const saved = localStorage.getItem('app_sync_config');
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      spreadsheetId: parsed?.spreadsheetId || '',
      apiKey: parsed?.apiKey || '',
      accessToken: parsed?.accessToken || '',
      useLocalStorage: parsed ? parsed.useLocalStorage : true,
      lastSync: parsed?.lastSync || '',
      customClientId: parsed?.customClientId || '',
      imageFolderId: parsed?.imageFolderId || ''
    };
  });

  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDbHelp, setShowDbHelp] = useState(false);

  // Synchronize Firestore and load real-time listeners on mount
  useEffect(() => {
    let isMounted = true;
    let unsubscribes: (() => void)[] = [];
    let hasConnected = false;

    // Safety fallback timeout: if Firestore takes more than 10 seconds to respond,
    // we proceed with local storage so the application is not stuck forever on the loading screen.
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && !hasConnected) {
        console.warn('Kết nối Firestore chậm (Timeout 10s). Đang tự động chuyển sang sử dụng bộ nhớ cục bộ (Local Storage) làm dự phòng.');
        setDbError('Thời gian kết nối Firestore vượt quá 10 giây. Đang chạy ở chế độ dự phòng cục bộ (Local Storage).');
        setIsDbLoaded(true);
      }
    }, 10000);

    async function initDb() {
      try {
        if (!isMounted) return;

        // Common handler when the first successful data snapshot is received
        const handleFirstConnection = () => {
          if (!hasConnected) {
            hasConnected = true;
            setDbError(null);
            clearTimeout(fallbackTimeout);
            setIsDbLoaded(true);
            console.log('Kết nối thành công với cơ sở dữ liệu Cloud Firestore!');
          }
        };

        // Subscribe to Teachers
        const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
          handleFirstConnection();
          const list: Teacher[] = [];
          snap.forEach(doc => list.push(doc.data() as Teacher));
          if (list.length > 0) setTeachers(list);
        }, (err) => {
          console.error('Lỗi subscription teachers:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubTeachers);

        // Subscribe to SchoolYears
        const unsubYears = onSnapshot(collection(db, 'schoolYears'), (snap) => {
          handleFirstConnection();
          const list: SchoolYear[] = [];
          snap.forEach(doc => list.push(doc.data() as SchoolYear));
          if (list.length > 0) setSchoolYears(list);
        }, (err) => {
          console.error('Lỗi subscription schoolYears:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubYears);

        // Subscribe to Classes
        const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
          handleFirstConnection();
          const list: ClassItem[] = [];
          snap.forEach(doc => list.push(doc.data() as ClassItem));
          if (list.length > 0) setClasses(list);
        }, (err) => {
          console.error('Lỗi subscription classes:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubClasses);

        // Subscribe to Students
        const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
          handleFirstConnection();
          const list: Student[] = [];
          snap.forEach(doc => list.push(doc.data() as Student));
          setStudents(list);
        }, (err) => {
          console.error('Lỗi subscription students:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubStudents);

        // Subscribe to Violations
        const unsubViolations = onSnapshot(collection(db, 'violations'), (snap) => {
          handleFirstConnection();
          const list: ViolationRecord[] = [];
          snap.forEach(doc => list.push(doc.data() as ViolationRecord));
          setViolations(list);
        }, (err) => {
          console.error('Lỗi subscription violations:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubViolations);

        // Subscribe to ViolationTypes
        const unsubTypes = onSnapshot(collection(db, 'violationTypes'), (snap) => {
          handleFirstConnection();
          const list: ViolationType[] = [];
          snap.forEach(doc => list.push(doc.data() as ViolationType));
          if (list.length > 0) setViolationTypes(list);
        }, (err) => {
          console.error('Lỗi subscription violationTypes:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubTypes);

        // Subscribe to Plans
        const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
          handleFirstConnection();
          const list: WeeklyPlan[] = [];
          snap.forEach(doc => list.push(doc.data() as WeeklyPlan));
          setPlans(list);
        }, (err) => {
          console.error('Lỗi subscription plans:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubPlans);

        // Subscribe to Tasks
        const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
          handleFirstConnection();
          const list: StudentTask[] = [];
          snap.forEach(doc => list.push(doc.data() as StudentTask));
          setTasks(list);
        }, (err) => {
          console.error('Lỗi subscription tasks:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubTasks);

        // Subscribe to AcademicUpdates
        const unsubAcademic = onSnapshot(collection(db, 'academicUpdates'), (snap) => {
          handleFirstConnection();
          const list: AcademicUpdate[] = [];
          snap.forEach(doc => list.push(doc.data() as AcademicUpdate));
          setAcademicUpdates(list);
        }, (err) => {
          console.error('Lỗi subscription academicUpdates:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubAcademic);

        // Subscribe to Users
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
          handleFirstConnection();
          const list: SystemUser[] = [];
          snap.forEach(doc => list.push(doc.data() as SystemUser));
          if (list.length > 0) {
            list.sort((a, b) => a.stt - b.stt);
            setUsers(list);
          }
        }, (err) => {
          console.error('Lỗi subscription users:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubUsers);

        // Subscribe to Global Settings
        const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
          handleFirstConnection();
          snap.forEach(docDoc => {
            if (docDoc.id === 'global') {
              const data = docDoc.data();
              if (data.adminPin) setAdminPin(data.adminPin);
              if (data.config) setConfig(data.config);
            } else if (docDoc.id === 'weeks') {
              const data = docDoc.data();
              if (data.startDate && data.totalWeeks) {
                localStorage.setItem('schoolYearStartDate', data.startDate);
                localStorage.setItem('totalSchoolWeeks', data.totalWeeks.toString());
                // Dispatch event so other components receive the storage change
                window.dispatchEvent(new Event('storage'));
              }
            }
          });
        }, (err) => {
          console.error('Lỗi subscription settings:', err);
          if (!hasConnected) setDbError(err?.message || String(err));
        });
        unsubscribes.push(unsubSettings);

        // Check and seed the database in the background without blocking the UI
        dbService.isCollectionEmpty('schoolYears')
          .then(async (empty) => {
            if (empty && isMounted) {
              console.log('Cơ sở dữ liệu Firestore trống. Đang tải dữ liệu ban đầu lên...');
              await dbService.seedFirestore({
                teachers,
                schoolYears,
                classes,
                students,
                violations,
                violationTypes,
                plans,
                tasks,
                academicUpdates,
                adminPin,
                config,
                users
              });
            }
          })
          .catch((err) => {
            console.warn('Lỗi kiểm tra/seed database trong nền:', err);
          });

      } catch (err: any) {
        console.error('Lỗi khi thiết lập Real-time Firestore:', err);
        if (!hasConnected) {
          setDbError(err?.message || String(err));
          setIsDbLoaded(true);
        }
      }
    }

    initDb();

    return () => {
      isMounted = false;
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Derived state values for compatibility
  const currentClass = classes.find(c => c.id === activeClassId) || classes[0];
  const currentSchoolYear = schoolYears.find(y => y.id === activeSchoolYearId) || schoolYears[0];
  const currentTeacher = teachers.find(t => t.id === currentClass?.teacherId) || teachers[0];

  const className = currentClass ? currentClass.name : 'Lớp 11A1';
  const schoolYear = currentSchoolYear ? currentSchoolYear.name : '2025-2026';
  const teacherName = currentTeacher ? currentTeacher.name : 'Cô Nguyễn Tuyết Mai';

  // Determine if this is an "old school year" to lock updates on tasks/discipline
  const latestSchoolYear = [...schoolYears].sort((a, b) => b.name.localeCompare(a.name))[0];
  const isOldYear = currentSchoolYear && latestSchoolYear && currentSchoolYear.id !== latestSchoolYear.id;
  const isReadOnly = isOldYear;

  // Persist Relational Data to Local Storage
  useEffect(() => {
    localStorage.setItem('app_teachers_relational', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('app_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('app_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('app_admin_pin', adminPin);
  }, [adminPin]);

  useEffect(() => {
    localStorage.setItem('app_school_years_relational', JSON.stringify(schoolYears));
  }, [schoolYears]);

  useEffect(() => {
    localStorage.setItem('app_classes_relational', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('app_students_relational', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('app_violations_relational', JSON.stringify(violations));
  }, [violations]);

  useEffect(() => {
    localStorage.setItem('app_violation_types', JSON.stringify(violationTypes));
  }, [violationTypes]);

  useEffect(() => {
    localStorage.setItem('app_plans_relational', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('app_tasks_relational', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('app_academic_updates', JSON.stringify(academicUpdates));
  }, [academicUpdates]);

  useEffect(() => {
    localStorage.setItem('app_active_year_id_relational', activeSchoolYearId);
  }, [activeSchoolYearId]);

  useEffect(() => {
    localStorage.setItem('app_active_class_id_relational', activeClassId);
  }, [activeClassId]);

  useEffect(() => {
    localStorage.setItem('app_sync_config', JSON.stringify(config));
  }, [config]);

  // State modifiers
  const handleAddStudent = (s: Student) => {
    const student = { ...s, classId: s.classId || activeClassId, className: s.className || className, schoolYear: s.schoolYear || schoolYear };
    setStudents(prev => [...prev, student]);
    dbService.saveStudent(student);
  };

  const handleUpdateStudent = (s: Student) => {
    const student = { ...s, classId: s.classId || activeClassId, className: s.className || className, schoolYear: s.schoolYear || schoolYear };
    setStudents(prev => prev.map(item => item.id === s.id ? student : item));
    dbService.saveStudent(student);
  };

  const handleDeleteStudent = (id: string) => {
    // 1. Delete student record
    setStudents(prev => prev.filter(item => item.id !== id));
    dbService.deleteStudent(id);

    // 2. Cascade delete violations belonging to this student (both state and Firestore)
    const removedViolations = violations.filter(item => item.studentId === id);
    removedViolations.forEach(v => dbService.deleteViolation(v.id));
    setViolations(prev => prev.filter(item => item.studentId !== id));

    // 3. Cascade delete tasks assigned specifically to this student
    const removedTasks = tasks.filter(item => item.studentId === id);
    removedTasks.forEach(t => dbService.deleteTask(t.id));
    setTasks(prev => prev.filter(item => item.studentId !== id));

    // 4. Cascade delete academic updates belonging to this student
    const removedUpdates = academicUpdates.filter(item => item.studentId === id);
    removedUpdates.forEach(u => dbService.deleteAcademicUpdate(u.id));
    setAcademicUpdates(prev => prev.filter(item => item.studentId !== id));
  };

  const handleAddViolation = (v: ViolationRecord) => {
    const violation = { ...v, classId: activeClassId, className, schoolYear };
    setViolations(prev => [...prev, violation]);
    dbService.saveViolation(violation);
  };

  const handleUpdateViolation = (v: ViolationRecord) => {
    const violation = { ...v, classId: v.classId || activeClassId, className: v.className || className, schoolYear: v.schoolYear || schoolYear };
    setViolations(prev => prev.map(item => item.id === v.id ? violation : item));
    dbService.saveViolation(violation);
  };

  const handleDeleteViolation = (id: string) => {
    setViolations(prev => prev.filter(item => item.id !== id));
    dbService.deleteViolation(id);
  };

  const handleAddPlan = (p: WeeklyPlan) => {
    const plan = { ...p, classId: activeClassId, className, schoolYear };
    setPlans(prev => [...prev, plan]);
    dbService.savePlan(plan);
  };

  const handleUpdatePlan = (p: WeeklyPlan) => {
    const plan = { ...p, classId: p.classId || activeClassId, className: p.className || className, schoolYear: p.schoolYear || schoolYear };
    setPlans(prev => prev.map(item => item.id === p.id ? plan : item));
    dbService.savePlan(plan);
  };

  const handleDeletePlan = (id: string) => {
    setPlans(prev => prev.filter(item => item.id !== id));
    dbService.deletePlan(id);
  };

  const handleAddTask = (t: StudentTask) => {
    const task = { ...t, classId: activeClassId, className, schoolYear };
    setTasks(prev => [...prev, task]);
    dbService.saveTask(task);
  };

  const handleUpdateTask = (t: StudentTask) => {
    const task = { ...t, classId: t.classId || activeClassId, className: t.className || className, schoolYear: t.schoolYear || schoolYear };
    setTasks(prev => prev.map(item => item.id === t.id ? task : item));
    dbService.saveTask(task);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(item => item.id !== id));
    dbService.deleteTask(id);
  };

  const handleAddAcademicUpdate = (update: AcademicUpdate) => {
    setAcademicUpdates(prev => [...prev, update]);
    dbService.saveAcademicUpdate(update);
  };

  const handleUpdateAcademicUpdate = (update: AcademicUpdate) => {
    setAcademicUpdates(prev => prev.map(u => u.id === update.id ? update : u));
    dbService.saveAcademicUpdate(update);
  };

  const handleDeleteAcademicUpdate = (id: string) => {
    setAcademicUpdates(prev => prev.filter(u => u.id !== id));
    dbService.deleteAcademicUpdate(id);
  };

  const handleUpdateTeachers = (updated: Teacher[]) => {
    const removed = teachers.filter(t => !updated.some(u => u.id === t.id));
    removed.forEach(t => dbService.deleteTeacher(t.id));
    setTeachers(updated);
    updated.forEach(item => dbService.saveTeacher(item));
  };

  const handleUpdateSchoolYears = (updated: SchoolYear[]) => {
    const removed = schoolYears.filter(sy => !updated.some(u => u.id === sy.id));
    if (removed.length > 0) {
      const removedIds = removed.map(sy => sy.id);
      
      // 1. Delete school years from DB
      removedIds.forEach(id => dbService.deleteSchoolYear(id));
      
      // 2. Cascade delete classes belonging to the removed school years
      const remainingClasses = classes.filter(c => !removedIds.includes(c.schoolYearId));
      handleUpdateClasses(remainingClasses);
    }
    setSchoolYears(updated);
    if (removed.length === 0) {
      updated.forEach(item => dbService.saveSchoolYear(item));
    }
  };

  const handleUpdateClasses = (updated: ClassItem[]) => {
    const removed = classes.filter(c => !updated.some(u => u.id === c.id));
    
    if (removed.length > 0) {
      const removedIds = removed.map(c => c.id);
      
      // 1. Delete classes from DB
      removedIds.forEach(id => dbService.deleteClass(id));
      
      // 2. Cascade delete students belonging to these classes
      const remainingStudents = students.filter(s => !removedIds.includes(s.classId || ''));
      const removedStudents = students.filter(s => removedIds.includes(s.classId || ''));
      removedStudents.forEach(s => dbService.deleteStudent(s.id));
      setStudents(remainingStudents);
      
      // 3. Cascade delete violations of these classes
      const remainingViolations = violations.filter(v => !removedIds.includes(v.classId || ''));
      const removedViolations = violations.filter(v => removedIds.includes(v.classId || ''));
      removedViolations.forEach(v => dbService.deleteViolation(v.id));
      setViolations(remainingViolations);
      
      // 4. Cascade delete plans of these classes
      const remainingPlans = plans.filter(p => !removedIds.includes(p.classId || ''));
      const removedPlans = plans.filter(p => removedIds.includes(p.classId || ''));
      removedPlans.forEach(p => dbService.deletePlan(p.id));
      setPlans(remainingPlans);

      // 5. Cascade delete tasks of these classes
      const remainingTasks = tasks.filter(t => !removedIds.includes(t.classId || ''));
      const removedTasks = tasks.filter(t => removedIds.includes(t.classId || ''));
      removedTasks.forEach(t => dbService.deleteTask(t.id));
      setTasks(remainingTasks);

      // 6. Cascade delete academic updates of these classes
      const remainingUpdates = academicUpdates.filter(u => !removedIds.includes(u.classId || ''));
      const removedUpdates = academicUpdates.filter(u => removedIds.includes(u.classId || ''));
      removedUpdates.forEach(u => dbService.deleteAcademicUpdate(u.id));
      setAcademicUpdates(remainingUpdates);
    }

    setClasses(updated);
    if (removed.length === 0) {
      updated.forEach(item => dbService.saveClass(item));
    }
  };

  const handleUpdateViolationTypes = (updated: ViolationType[]) => {
    const removed = violationTypes.filter(vt => !updated.some(u => u.id === vt.id));
    removed.forEach(vt => dbService.deleteViolationType(vt.id));
    setViolationTypes(updated);
    updated.forEach(v => dbService.saveViolationType(v));
  };

  const handleUpdateStudents = (updated: Student[]) => {
    const removed = students.filter(s => !updated.some(u => u.id === s.id));
    if (removed.length > 0) {
      const removedIds = removed.map(s => s.id);

      // 1. Delete students from DB
      removed.forEach(s => dbService.deleteStudent(s.id));

      // 2. Cascade delete violations of removed students
      const removedViolations = violations.filter(v => removedIds.includes(v.studentId));
      removedViolations.forEach(v => dbService.deleteViolation(v.id));
      setViolations(prev => prev.filter(v => !removedIds.includes(v.studentId)));

      // 3. Cascade delete tasks assigned specifically to removed students
      const removedTasks = tasks.filter(t => removedIds.includes(t.studentId));
      removedTasks.forEach(t => dbService.deleteTask(t.id));
      setTasks(prev => prev.filter(t => !removedIds.includes(t.studentId)));

      // 4. Cascade delete academic updates of removed students
      const removedAcademic = academicUpdates.filter(a => removedIds.includes(a.studentId));
      removedAcademic.forEach(a => dbService.deleteAcademicUpdate(a.id));
      setAcademicUpdates(prev => prev.filter(a => !removedIds.includes(a.studentId)));
    }

    setStudents(updated);
    if (removed.length === 0) {
      updated.forEach(s => dbService.saveStudent(s));
    }
  };

  const handleUpdateViolations = (updated: ViolationRecord[]) => {
    const removed = violations.filter(v => !updated.some(u => u.id === v.id));
    removed.forEach(v => dbService.deleteViolation(v.id));
    setViolations(updated);
    updated.forEach(v => dbService.saveViolation(v));
  };

  const handleUpdatePlans = (updated: WeeklyPlan[]) => {
    const removed = plans.filter(p => !updated.some(u => u.id === p.id));
    removed.forEach(p => dbService.deletePlan(p.id));
    setPlans(updated);
    updated.forEach(p => dbService.savePlan(p));
  };

  const handleUpdateTasks = (updated: StudentTask[]) => {
    const removed = tasks.filter(t => !updated.some(u => u.id === t.id));
    removed.forEach(t => dbService.deleteTask(t.id));
    setTasks(updated);
    updated.forEach(t => dbService.saveTask(t));
  };

  const handleUpdateAdminPin = (newPin: string) => {
    setAdminPin(newPin);
    dbService.saveGlobalSettings({ adminPin: newPin, config });
  };

  const handleUpdateConfig = (newConfig: SheetSyncConfig) => {
    setConfig(newConfig);
    dbService.saveGlobalSettings({ adminPin, config: newConfig });
  };

  const handleUpdateUserPassword = async (userId: string, newPassword: string) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, matkhau: newPassword } : u);
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
    
    const userToSave = updatedUsers.find(u => u.id === userId);
    if (userToSave) {
      await dbService.saveUser(userToSave);
      
      if (currentUser && currentUser.id === userId) {
        const updatedCurrentUser = { ...currentUser, matkhau: newPassword };
        setCurrentUser(updatedCurrentUser);
        localStorage.setItem('app_current_user', JSON.stringify(updatedCurrentUser));
      }
    }
  };

  const handleAddUser = async (newUser: SystemUser) => {
    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem('app_users', JSON.stringify(updated));
    await dbService.saveUser(newUser);
  };

  const handleDeleteUser = async (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    localStorage.setItem('app_users', JSON.stringify(updated));
    await dbService.deleteUser(userId);
  };

  // Filter data by currently active Class (relational classId matching)
  const filteredStudents = students.filter(s => s.classId === activeClassId);

  const filteredViolations = violations.filter(v => v.classId === activeClassId);

  const filteredPlans = plans.filter(p => p.classId === activeClassId);

  const filteredTasks = tasks.filter(t => t.classId === activeClassId || (t.studentId !== 'Tất cả' && filteredStudents.some(s => s.id === t.studentId)));

  // --- OVERVIEW CALCULATIONS ---
  const activeStudentsCount = filteredStudents.filter(s => s.status === 'Đang học').length;
  const femaleCount = filteredStudents.filter(s => s.status === 'Đang học' && s.gender === 'Nữ').length;
  const maleCount = activeStudentsCount - femaleCount;

  const totalViolationsCount = filteredViolations.length;
  const completedTasksCount = filteredTasks.filter(t => t.status === 'Đã hoàn thành').length;
  const taskCompletionRate = filteredTasks.length > 0 ? Math.round((completedTasksCount / filteredTasks.length) * 100) : 100;

  // Calculate points deducted per student
  const studentViolationsSummary = filteredStudents.map(s => {
    const sViolations = filteredViolations.filter(v => v.studentId === s.id);
    const totalDeductions = sViolations.reduce((sum, v) => sum + v.points, 0);
    return { ...s, totalDeductions, violationCount: sViolations.length };
  });

  const topBehavingStudents = [...studentViolationsSummary]
    .filter(s => s.status === 'Đang học' && s.totalDeductions === 0)
    .slice(0, 5);

  const warningStudents = [...studentViolationsSummary]
    .filter(s => s.status === 'Đang học' && s.totalDeductions < 0)
    .sort((a, b) => a.totalDeductions - b.totalDeductions)
    .slice(0, 5);

  const getTabLabel = () => {
    switch (activeTab) {
      case 'overview': return 'Tổng quan';
      case 'students': return 'Thông tin';
      case 'diligence': return 'Vi phạm';
      case 'academic': return 'Học tập & Rèn Luyện';
      case 'class': return 'Quản lý';
      case 'news': return 'Tin tức / Thông báo';
      case 'plans': return 'Kế hoạch';
      case 'tasks': return 'Nhiệm vụ';
      case 'settings': return 'Quản lý chung';
      default: return 'Bảng';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'overview': return 'Tuần mới';
      case 'students': return 'Học sinh';
      case 'diligence': return '& Chuyên cần';
      case 'academic': return '& Kết quả';
      case 'class': return 'Lớp học';
      case 'news': return 'Cổng thông tin';
      case 'plans': return 'Giảng dạy';
      case 'tasks': return '& Báo cáo';
      case 'settings': return '& Cài đặt hệ thống';
      default: return 'Điều khiển';
    }
  };

  const getVietnameseDate = () => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const today = new Date();
    const dayName = days[today.getDay()];
    const date = today.getDate();
    const month = today.getMonth() + 1;
    return `${dayName}, ${date} Tháng ${month}`;
  };

  if (!isDbLoaded) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#050505] text-white font-sans">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-white">ĐANG ĐỒNG BỘ CƠ SỞ DỮ LIỆU</h2>
            <p className="text-xs text-white/40">Đang kết nối thời gian thực với hệ thống nề nếp THPT Nguyễn Hữu Cầu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'public') {
    return (
      <>
        <PublicPortal
          schoolYears={schoolYears}
          initialSchoolYearId={activeSchoolYearId}
          students={students}
          classes={classes}
          violations={violations}
          plans={plans}
          tasks={tasks}
          teachers={teachers}
          academicUpdates={academicUpdates}
          onOpenAdmin={() => {
            if (currentUser) {
              setViewMode('admin');
            } else {
              setLoginUsername('');
              setLoginPassword('');
              setLoginError('');
              setIsAuthModalOpen(true);
            }
          }}
        />

        {/* Beautiful Username/Password Authentication Modal (Bright & Modern Light Theme) */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn select-none">
            <div 
              className="bg-white rounded-[32px] p-8 max-w-sm w-full border border-slate-100 space-y-6 text-center shadow-2xl animate-scaleUp text-slate-800"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto border border-blue-100">
                  <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800">XÁC THỰC QUYỀN HỆ THỐNG</h3>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vui lòng nhập Tên tài khoản và Mật khẩu được cấp để đăng nhập vào trang quản trị.
                  </p>
                </div>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const foundUser = users.find(u => u.ten.toLowerCase() === loginUsername.trim().toLowerCase() && u.matkhau === loginPassword);
                  
                  if (foundUser) {
                    setCurrentUser(foundUser);
                    setViewMode('admin');
                    setIsAuthModalOpen(false);
                    setLoginUsername('');
                    setLoginPassword('');
                    setLoginError('');
                    
                    // If hotro, automatically select "class" tab because other tabs are frozen
                    if (foundUser.quyen === 'hotro') {
                      setActiveTab('class');
                    }
                  } else {
                    setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
                  }
                }}
                className="space-y-4 text-left"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Tên tài khoản</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Ví dụ: admin, hotro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Mật khẩu</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                    required
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-rose-500 font-bold text-center animate-shake">{loginError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center cursor-pointer uppercase tracking-wider shadow-lg shadow-blue-500/15"
                >
                  Đăng nhập
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setLoginUsername('');
                    setLoginPassword('');
                    setLoginError('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition cursor-pointer"
                >
                  Quay lại Trang Chủ Công Khai
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const isTabFrozen = (tabId: string) => {
    return currentUser?.quyen === 'hotro' && tabId !== 'class' && tabId !== 'news';
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <div className="flex flex-1 w-full overflow-hidden">
        
        {/* Sidebar Navigation - Visible on desktop */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex h-full select-none shadow-sm">
          <div className="p-8 pb-4 text-left">
            <h1 className="text-2xl font-serif italic text-slate-900 tracking-tight">THPT Nguyễn Hữu Cầu<span className="text-amber-500">.</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2 font-bold">HỆ THỐNG QUẢN LÝ</p>
          </div>


        
        {/* Nav tabs */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* General Section */}
          <div className="space-y-1.5">
            <button
              id="nav-tab-overview"
              disabled={isTabFrozen('overview')}
              onClick={() => {
                if (!isTabFrozen('overview')) setActiveTab('overview');
              }}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition text-xs font-semibold border text-left ${
                isTabFrozen('overview')
                  ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                  : activeTab === 'overview'
                    ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={14} className={activeTab === 'overview' ? 'text-amber-600' : 'text-slate-400'} />
                <span>Tổng quan chung</span>
              </div>
              {isTabFrozen('overview') && <Lock size={12} className="text-slate-400" />}
            </button>
          </div>

          {/* HỌC SINH SECTION */}
          <div className="space-y-1.5 animate-fadeIn">
            <div className="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 flex items-center gap-1.5 mb-2 font-sans">
              <Users size={12} className="text-amber-500/60" /> Menu Học Sinh
            </div>
            <div className="pl-1.5 space-y-1 border-l border-slate-100 ml-2">
              <button
                id="nav-tab-students"
                disabled={isTabFrozen('students')}
                onClick={() => {
                  if (!isTabFrozen('students')) setActiveTab('students');
                }}
                className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                  isTabFrozen('students')
                    ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                    : activeTab === 'students'
                      ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                      : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'students' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <span>Thông tin Học sinh</span>
                </div>
                {isTabFrozen('students') && <Lock size={12} className="text-slate-400" />}
              </button>

              <button
                id="nav-tab-diligence"
                disabled={isTabFrozen('diligence')}
                onClick={() => {
                  if (!isTabFrozen('diligence')) setActiveTab('diligence');
                }}
                className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                  isTabFrozen('diligence')
                    ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                    : activeTab === 'diligence'
                      ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                      : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'diligence' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <span>Vi phạm & Chuyên cần</span>
                </div>
                {isTabFrozen('diligence') && <Lock size={12} className="text-slate-400" />}
              </button>

              <button
                id="nav-tab-academic"
                disabled={isTabFrozen('academic')}
                onClick={() => {
                  if (!isTabFrozen('academic')) setActiveTab('academic');
                }}
                className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                  isTabFrozen('academic')
                    ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                    : activeTab === 'academic'
                      ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                      : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'academic' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <span>Học tập & Rèn Luyện</span>
                </div>
                {isTabFrozen('academic') && <Lock size={12} className="text-slate-400" />}
              </button>
            </div>
          </div>

          {/* MENU LỚP SECTION */}
          <div className="space-y-1.5 animate-fadeIn">
            <div className="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 flex items-center gap-1.5 mb-2 font-sans">
              <Grid size={12} className="text-amber-500/60" /> Menu Lớp
            </div>
            <div className="pl-1.5 space-y-1 border-l border-slate-100 ml-2">
              <button
                id="nav-tab-class"
                disabled={isTabFrozen('class')}
                onClick={() => {
                  if (!isTabFrozen('class')) setActiveTab('class');
                }}
                className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                  isTabFrozen('class')
                    ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                    : activeTab === 'class'
                      ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                      : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'class' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <span>Sơ đồ, Tổ & TKB</span>
                </div>
                {isTabFrozen('class') && <Lock size={12} className="text-slate-400" />}
              </button>

              <button
                id="nav-tab-news"
                disabled={isTabFrozen('news')}
                onClick={() => {
                  if (!isTabFrozen('news')) setActiveTab('news');
                }}
                className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                  isTabFrozen('news')
                    ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                    : activeTab === 'news'
                      ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                      : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'news' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <span>Tin Tức</span>
                </div>
                {isTabFrozen('news') && <Lock size={12} className="text-slate-400" />}
              </button>
            </div>
          </div>

          {/* GIÁO VIÊN SECTION */}
          {userRole === 'teacher' && (
            <div className="space-y-1.5 animate-fadeIn">
              <div className="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 flex items-center gap-1.5 mb-2 font-sans">
                <BookOpen size={12} className="text-amber-500/60" /> Menu Giáo Viên
              </div>
              <div className="pl-1.5 space-y-1 border-l border-slate-100 ml-2">
                <button
                  id="nav-tab-plans"
                  disabled={isTabFrozen('plans')}
                  onClick={() => {
                    if (!isTabFrozen('plans')) setActiveTab('plans');
                  }}
                  className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                    isTabFrozen('plans')
                      ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                      : activeTab === 'plans'
                        ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                        : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'plans' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                    <span>Kế hoạch Tuần</span>
                  </div>
                  {isTabFrozen('plans') && <Lock size={12} className="text-slate-400" />}
                </button>

                <button
                  id="nav-tab-tasks"
                  disabled={isTabFrozen('tasks')}
                  onClick={() => {
                    if (!isTabFrozen('tasks')) setActiveTab('tasks');
                  }}
                  className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                    isTabFrozen('tasks')
                      ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                      : activeTab === 'tasks'
                        ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                        : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'tasks' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                    <span>Nhiệm vụ & Báo cáo</span>
                  </div>
                  {isTabFrozen('tasks') && <Lock size={12} className="text-slate-400" />}
                </button>

                <button
                  id="nav-tab-settings"
                  disabled={isTabFrozen('settings')}
                  onClick={() => {
                    if (!isTabFrozen('settings')) setActiveTab('settings');
                  }}
                  className={`w-full p-2 rounded-xl flex items-center justify-between transition text-xs font-medium border text-left ${
                    isTabFrozen('settings')
                      ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40 bg-transparent'
                      : activeTab === 'settings'
                        ? 'bg-amber-50 border-amber-200/80 text-amber-900 shadow-sm'
                        : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                    <span>Quản lý chung</span>
                  </div>
                  {isTabFrozen('settings') && <Lock size={12} className="text-slate-400" />}
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer with profile info and connection state */}
        <div className="p-5 mt-auto border-t border-slate-150 bg-slate-50/50">
          <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
            {/* Giáo viên */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-serif italic text-amber-600 shrink-0 font-bold">
                GV
              </div>
              <div className="text-xs font-semibold text-slate-700 truncate" title={`GVCN: ${teacherName}`}>
                {teacherName}
              </div>
            </div>

            {/* Niên khóa */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-400">Niên khóa:</span>
              <select
                id="sidebar-year-select"
                value={activeSchoolYearId}
                onChange={(e) => {
                  const yearId = e.target.value;
                  setActiveSchoolYearId(yearId);
                  const firstClass = classes.find(c => c.schoolYearId === yearId);
                  if (firstClass) {
                    setActiveClassId(firstClass.id);
                  }
                }}
                className="bg-transparent text-slate-800 border-none p-0 text-right focus:ring-0 focus:outline-none font-mono cursor-pointer hover:text-amber-500 transition text-xs max-w-[120px]"
              >
                {schoolYears.map(y => (
                  <option key={y.id} value={y.id} className="bg-white text-slate-800 font-mono text-xs">{y.name}</option>
                ))}
              </select>
            </div>

            {/* Lớp học */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-400">Lớp:</span>
              <select
                id="sidebar-class-select"
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="bg-transparent text-slate-800 border-none p-0 text-right focus:ring-0 focus:outline-none font-semibold cursor-pointer hover:text-amber-500 transition text-xs max-w-[120px]"
              >
                {classes.filter(c => c.schoolYearId === activeSchoolYearId).map(c => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-800 text-xs">{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace (Scrollable content) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Compact Mobile Header with sliding tabs */}
        <header className="md:hidden bg-white border-b border-slate-200 flex flex-col shrink-0">
          <div className="p-4 flex items-center justify-between">
            <h1 className="text-lg font-serif italic text-slate-900 tracking-tight">EduAdmin<span className="text-amber-500">.</span></h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">{className}</span>
              <span className="text-xs text-slate-400 font-mono">({schoolYear})</span>
            </div>
          </div>
          
          {/* Scrollable Tabs for Mobile */}
          <div className="px-4 pb-2 overflow-x-auto flex gap-1 scrollbar-none">
            {[
              { id: 'overview', label: 'Tổng quan' },
              { id: 'students', label: 'HS: Thông tin' },
              { id: 'diligence', label: 'HS: Vi phạm' },
              { id: 'class', label: 'Lớp: Quản lý' },
              { id: 'news', label: 'Lớp: Tin tức' },
              { id: 'plans', label: 'GV: Kế hoạch', isTeacherOnly: true },
              { id: 'tasks', label: 'GV: Nhiệm vụ', isTeacherOnly: true },
              { id: 'settings', label: 'GV: Quản lý', isTeacherOnly: true }
            ].map(tab => {
              const isSelected = activeTab === tab.id;
              const frozen = isTabFrozen(tab.id);
              return (
                <button
                  key={tab.id}
                  disabled={frozen}
                  onClick={() => {
                    if (!frozen) setActiveTab(tab.id as any);
                  }}
                  className={`py-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                    frozen
                      ? 'opacity-40 text-slate-300 bg-transparent border border-slate-100 cursor-not-allowed'
                      : isSelected
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-950 bg-slate-100'
                  }`}
                >
                  {frozen && <Lock size={10} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
          
          {/* Workspace Header Section */}
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-2 border-b border-slate-200">
            <div>
              <p className="text-amber-600 font-semibold text-xs md:text-sm tracking-wider uppercase mb-1">{getVietnameseDate()}</p>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
                {getTabLabel()} <span className="font-extrabold text-amber-500">{getTabSubtitle()}</span>
              </h2>
            </div>
            
            {/* Quick Actions at right */}
            {userRole === 'teacher' && (
              <div className="flex gap-2.5">
                <button 
                  disabled={currentUser?.quyen === 'hotro'}
                  onClick={() => {
                    if (currentUser?.quyen === 'hotro') return;
                    if (activeTab === 'plans') {
                      const btn = document.getElementById('plan-pdf-btn');
                      btn?.click();
                    } else if (activeTab === 'tasks') {
                      const btn = document.getElementById('btn-report-download-pdf');
                      btn?.click();
                    } else {
                      setActiveTab('tasks');
                      alert('Chuyển qua tab Nhiệm vụ & Báo cáo để xuất tệp PDF tổng hợp!');
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider shadow-md transition flex items-center gap-1.5 ${
                    currentUser?.quyen === 'hotro'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/15 cursor-pointer'
                  }`}
                >
                  {currentUser?.quyen === 'hotro' && <Lock size={12} />}
                  XUẤT BÁO CÁO PDF
                </button>
              </div>
            )}
          </header>

          {/* Component Views */}
          <div className="w-full">
            {activeTab === 'overview' && (
              /* OVERVIEW DASHBOARD VIEW */
              <div className="space-y-6 animate-fadeIn">
                
                {/* Class overview metric cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-light tracking-tight text-slate-800">{activeStudentsCount}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-bold">Học sinh Sĩ số</div>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-200/50">
                      <Users size={20} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-light tracking-tight text-slate-800">{totalViolationsCount}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-bold">Vi phạm đã ghi</div>
                    </div>
                    <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl border border-rose-200/50">
                      <ShieldAlert size={20} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-light tracking-tight text-slate-800">{taskCompletionRate}%</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-bold">Hoàn thành nhiệm vụ</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-200/50">
                      <CheckCircle size={20} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-light tracking-tight text-slate-800">
                        {plans.length > 0 ? `Tuần ${Math.max(...plans.map(p => p.weekNumber))}` : 'Chưa lập'}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-bold">Kế hoạch mới nhất</div>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-200/50">
                      <BookOpen size={20} />
                    </div>
                  </div>

                </div>

                {/* Sub content grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Top behaving student cards */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-1.5 font-sans font-bold">
                      <UserCheck size={16} className="text-emerald-600" /> Gương tốt nề nếp (0 điểm trừ)
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                      {topBehavingStudents.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs italic">
                          Không có học sinh nào đạt nề nếp tuyệt đối tuần này
                        </div>
                      ) : (
                        topBehavingStudents.map(s => (
                          <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between hover:bg-slate-100 transition">
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.id} • {s.gender}</div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] rounded-full border border-emerald-500/20 font-medium">
                              Tốt 🌟
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Warnings and negative behaviors */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-1.5 font-sans font-bold">
                      <AlertTriangle size={16} className="text-rose-600" /> Cần chấn chỉnh nề nếp
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                      {warningStudents.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs italic">
                          Cả lớp duy trì nề nếp hoàn hảo! 🎉
                        </div>
                      ) : (
                        warningStudents.map(s => (
                          <div key={s.id} className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between hover:bg-rose-100 transition">
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.id} • Có {s.violationCount} lỗi ghi nhận</div>
                            </div>
                            <span className="px-3 py-1 bg-rose-500/10 text-rose-600 text-[10px] rounded-full border border-rose-500/20 font-bold font-mono">
                              {s.totalDeductions}đ
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Class General Info & Education info */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm h-[400px] flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-sans font-bold">Học sinh theo giới tính</h3>
                      <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                        <div className="flex-1 text-center border-r border-slate-200">
                          <div className="text-2xl font-light text-amber-600">{maleCount}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Nam</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-2xl font-light text-pink-600">{femaleCount}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Nữ</div>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-200 max-h-[180px] overflow-y-auto custom-scrollbar">
                        <p className="text-[10px] uppercase tracking-widest text-amber-700 mb-2 font-bold">Nhiệm vụ & Trực nhật mới</p>
                        {filteredTasks.length > 0 ? (
                          <div className="space-y-3">
                            {filteredTasks.filter(t => t.status !== 'Đã hoàn thành').slice(-2).map((t, i) => (
                              <div key={t.id || i} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-amber-800 font-sans">{t.taskTitle}</span>
                                  <span className="text-[10px] text-slate-600">{t.studentName}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                              </div>
                            ))}
                            {filteredTasks.filter(t => t.status !== 'Đã hoàn thành').length === 0 && (
                              <p className="text-xs italic font-serif text-amber-800/60 leading-relaxed">
                                Tất cả nhiệm vụ tuần này đã hoàn thành!
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs italic font-serif text-slate-400 leading-relaxed">
                            Chưa có phân công nhiệm vụ nào được giao cho tuần này.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-center pt-4 border-t border-slate-200">
                      <button
                        id="btn-nav-to-settings"
                        onClick={() => setActiveTab('settings')}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Settings size={14} /> Đi tới Menu Admin & Quản lý chung
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <StudentManager
                students={filteredStudents}
                allStudents={students}
                violations={filteredViolations}
                tasks={filteredTasks}
                classes={classes}
                schoolYears={schoolYears}
                activeClassId={activeClassId}
                activeSchoolYearId={activeSchoolYearId}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                academicUpdates={academicUpdates}
                onAddAcademicUpdate={handleAddAcademicUpdate}
                onUpdateAcademicUpdate={handleUpdateAcademicUpdate}
                onDeleteAcademicUpdate={handleDeleteAcademicUpdate}
                imageFolderId={config.imageFolderId}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'diligence' && (
              <DiligenceManager
                students={filteredStudents}
                violations={filteredViolations}
                onAddViolation={handleAddViolation}
                onDeleteViolation={handleDeleteViolation}
                violationTypes={violationTypes}
                onUpdateViolationTypes={handleUpdateViolationTypes}
                onUpdateViolation={handleUpdateViolation}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'academic' && (
              <AcademicManager
                students={filteredStudents}
                academicUpdates={academicUpdates}
                onAddAcademicUpdate={handleAddAcademicUpdate}
                onUpdateAcademicUpdate={handleUpdateAcademicUpdate}
                onDeleteAcademicUpdate={handleDeleteAcademicUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'class' && (
              <ClassManager
                students={students}
                activeClassId={activeClassId}
                className={className}
                onUpdateStudent={handleUpdateStudent}
                isReadOnly={isReadOnly}
                tasks={tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'news' && (
              <NewsManager
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'plans' && (
              <WeeklyPlanner
                plans={filteredPlans}
                onAddPlan={handleAddPlan}
                onUpdatePlan={handleUpdatePlan}
                onDeletePlan={handleDeletePlan}
                activeClassName={className}
                teacherName={teacherName}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManager
                students={filteredStudents}
                violations={filteredViolations}
                tasks={filteredTasks}
                plans={filteredPlans}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                activeClassName={className}
                teacherName={teacherName}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'settings' && (
              <SystemSettings
                teachers={teachers}
                onUpdateTeachers={handleUpdateTeachers}
                schoolYears={schoolYears}
                onUpdateSchoolYears={handleUpdateSchoolYears}
                classes={classes}
                onUpdateClasses={handleUpdateClasses}
                activeSchoolYearId={activeSchoolYearId}
                onUpdateActiveSchoolYearId={setActiveSchoolYearId}
                activeClassId={activeClassId}
                onUpdateActiveClassId={setActiveClassId}
                violationTypes={violationTypes}
                onUpdateViolationTypes={handleUpdateViolationTypes}
                students={students}
                onUpdateStudents={handleUpdateStudents}
                violations={violations}
                onUpdateViolations={handleUpdateViolations}
                plans={plans}
                onUpdatePlans={handleUpdatePlans}
                tasks={tasks}
                onUpdateTasks={handleUpdateTasks}
                adminPin={adminPin}
                onUpdateAdminPin={handleUpdateAdminPin}
                currentUser={currentUser}
                onUpdateUserPassword={handleUpdateUserPassword}
                users={users}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
              />
            )}
          </div>

        </main>
      </div> {/* Close main workspace */}
    </div> {/* Close flex flex-1 w-full overflow-hidden */}

    {/* Beautiful Full Width Footer with system controls and connection state */}
    <footer className="bg-white border-t border-slate-200 px-4 md:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 select-none shadow-sm z-10">
      {/* Left: Connection Status */}
      <div 
        onClick={() => dbError && setShowDbHelp(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] md:text-[11px] font-bold cursor-pointer transition ${
          dbError 
            ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/50' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/50'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${dbError ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
        <span>{dbError ? 'DỰ PHÒNG CỤC BỘ' : 'ĐỒNG BỘ CLOUD'}</span>
        {dbError && <span className="text-[9px] underline opacity-80">(Chi tiết)</span>}
      </div>

      {/* Center: Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setViewMode('public')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-[10px] md:text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/15"
        >
          <span>← Quay lại Web Công Khai</span>
        </button>

        <button
          onClick={() => {
            setCurrentUser(null);
            setViewMode('public');
          }}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 font-bold text-[10px] md:text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut size={12} />
          <span>Đăng xuất Quản trị</span>
        </button>
      </div>

      {/* Right: Copyright/App Description */}
      <div className="text-[9px] md:text-[10px] text-slate-400 font-medium tracking-wide text-center sm:text-right max-w-xs md:max-w-none">
        Phần mềm hỗ trợ Giáo viên chủ nhiệm quản lý học sinh & xuất báo cáo PDF tự động
      </div>
    </footer>


      {/* Modal Hướng dẫn Gỡ lỗi Kết nối Firebase */}
      {showDbHelp && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-left">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl text-slate-800 space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="text-base font-bold text-slate-900">Tại sao dữ liệu không đồng bộ lên Cloud?</h3>
              </div>
              <button 
                onClick={() => setShowDbHelp(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3.5 leading-relaxed text-slate-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="font-bold text-rose-800 text-[13px] mb-1">💡 Bản chất hiện tượng "Xóa nhưng không đổi trên Console":</p>
                Do ứng dụng của bạn hiện đang gặp **lỗi kết nối (Timeout)** tới Firebase Cloud, ứng dụng đã tự chuyển sang chế độ **Dự phòng cục bộ (LocalStorage)**. Mọi thao tác Thêm/Sửa/Xóa của bạn chỉ lưu tạm trên trình duyệt này chứ chưa thể gửi lên Cloud. Đó là lý do bạn vào Firebase Console vẫn thấy dữ liệu cũ nguyên vẹn.
              </div>

              <h4 className="font-extrabold text-[13px] text-slate-900 border-b pb-1">BƯỚC KHẮC PHỤC (Làm lần lượt):</h4>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 text-[10px]">1</div>
                  <div>
                    <p className="font-bold text-slate-800">Khởi tạo Database Firestore trên Firebase Console</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Vào <b>Firebase Console</b> của dự án <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">quanlyhs-ba1de</code>, truy cập menu <b>Firestore Database</b> và đảm bảo bạn đã nhấn nút <b>"Create database"</b> (để tạo cơ sở dữ liệu mặc định <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">(default)</code>). Nếu chưa nhấn nút này, CSDL của bạn chưa tồn tại nên kết nối sẽ bị treo vĩnh viễn.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 text-[10px]">2</div>
                  <div>
                    <p className="font-bold text-slate-800">Chạy ngoài iFrame Sandbox của AI Studio</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Khung xem trước của AI Studio chạy dưới dạng một <b>iframe sandbox</b> bị hạn chế một số giao thức mạng. Anh hãy click mở ứng dụng trong một tab trình duyệt mới hoàn toàn bằng URL sau để giải quyết triệt để chặn iFrame:
                      <a 
                        href="https://ais-dev-6h5yfbnspjsjktqujkvky4-1079685014421.asia-southeast1.run.app" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 underline font-semibold block mt-1 break-all hover:text-blue-800"
                      >
                        👉 Click mở ứng dụng ở tab mới (Bản Dev)
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 text-[10px]">3</div>
                  <div>
                    <p className="font-bold text-slate-800">Kiểm tra Adblocker hoặc Tường lửa (Firewall)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Nếu dùng mạng cơ quan/trường học hoặc có các extension chặn quảng cáo, các luồng WebSocket của Firebase có thể bị chặn. Hãy thử tạm tắt Adblock hoặc chuyển sang mạng 4G/Wifi khác rồi tải lại trang để kiểm tra.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button 
                onClick={() => setShowDbHelp(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tôi đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
