import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Spinner from './components/Spinner';
import AdminLayout from './layouts/AdminLayout';
import TeacherLayout from './layouts/TeacherLayout';
import StudentLayout from './layouts/StudentLayout';

// Lazy loading de toutes les pages
const Login = lazy(() => import('./pages/Login'));

// Admin
const AdminDashboard    = lazy(() => import('./pages/admin/Dashboard'));
const AdminCourses      = lazy(() => import('./pages/admin/Courses'));
const AdminTeachers     = lazy(() => import('./pages/admin/Teachers'));
const AdminStudents     = lazy(() => import('./pages/admin/Students'));
const AdminRooms        = lazy(() => import('./pages/admin/Rooms'));
const AdminSchedule     = lazy(() => import('./pages/admin/Schedule'));
const AdminEnrollments  = lazy(() => import('./pages/admin/Enrollments'));
const AdminAbsences     = lazy(() => import('./pages/admin/Absences'));
const AdminStatistics   = lazy(() => import('./pages/admin/Statistics'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));

// Teacher
const TeacherDashboard  = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherClasses    = lazy(() => import('./pages/teacher/MyClasses'));
const TeacherSchedule   = lazy(() => import('./pages/teacher/Schedule'));
const TeacherAttendance = lazy(() => import('./pages/teacher/Attendance'));
const TeacherAssignments = lazy(() => import('./pages/teacher/Assignments'));
const TeacherAbsence    = lazy(() => import('./pages/teacher/ReportAbsence'));

// Student
const StudentDashboard    = lazy(() => import('./pages/student/Dashboard'));
const StudentSchedule     = lazy(() => import('./pages/student/Schedule'));
const StudentCourses      = lazy(() => import('./pages/student/Courses'));
const StudentEnrollments  = lazy(() => import('./pages/student/MyEnrollments'));
const StudentAssignments  = lazy(() => import('./pages/student/Assignments'));
const StudentAbsences     = lazy(() => import('./pages/student/Absences'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));

const RequireAuth = ({ children, role }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    // Rediriger vers le bon espace selon le rôle
    const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' };
    return <Navigate to={redirects[user.role] || '/login'} replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner page />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="enrollments" element={<AdminEnrollments />} />
            <Route path="absences" element={<AdminAbsences />} />
            <Route path="statistics" element={<AdminStatistics />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* Teacher */}
          <Route path="/teacher" element={<RequireAuth role="teacher"><TeacherLayout /></RequireAuth>}>
            <Route index element={<TeacherDashboard />} />
            <Route path="classes" element={<TeacherClasses />} />
            <Route path="schedule" element={<TeacherSchedule />} />
            <Route path="attendance" element={<TeacherAttendance />} />
            <Route path="assignments" element={<TeacherAssignments />} />
            <Route path="absence" element={<TeacherAbsence />} />
          </Route>

          {/* Student */}
          <Route path="/student" element={<RequireAuth role="student"><StudentLayout /></RequireAuth>}>
            <Route index element={<StudentDashboard />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="courses" element={<StudentCourses />} />
            <Route path="enrollments" element={<StudentEnrollments />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="absences" element={<StudentAbsences />} />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>

          {/* Redirection racine */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' };
  return <Navigate to={redirects[user.role] || '/login'} replace />;
}
