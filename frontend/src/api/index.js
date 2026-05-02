import api from './axios';

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// Admin
export const getTeachers = (params) => api.get('/admin/teachers', { params });
export const createTeacher = (data) => api.post('/admin/teachers', data);
export const toggleUser = (id) => api.patch(`/admin/users/${id}/toggle`);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const getStudents = (params) => api.get('/admin/students', { params });
export const getAdminCourseStudents = (courseId) => api.get(`/admin/courses/${courseId}/students`);
export const adminAddStudent = (courseId, studentId) => api.post(`/admin/courses/${courseId}/students`, { studentId });
export const adminRemoveStudent = (courseId, studentId) => api.delete(`/admin/courses/${courseId}/students/${studentId}`);

// Courses
export const getCourses = (params) => api.get('/courses', { params });
export const getCourse = (id) => api.get(`/courses/${id}`);
export const createCourse = (data) => api.post('/courses', data);
export const updateCourse = (id, data) => api.put(`/courses/${id}`, data);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);
export const getCourseStudents = (id) => api.get(`/courses/${id}/students`);

// Rooms
export const getRooms = () => api.get('/rooms');
export const createRoom = (data) => api.post('/rooms', data);
export const updateRoom = (id, data) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id) => api.delete(`/rooms/${id}`);

// Schedule
export const getSchedule = (params) => api.get('/schedule', { params });
export const createSchedule = (data) => api.post('/schedule', data);
export const updateSchedule = (id, data) => api.put(`/schedule/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/schedule/${id}`);

// Enrollments (admin)
export const getEnrollments = (params) => api.get('/enrollments', { params });
export const approveEnrollment = (id) => api.patch(`/enrollments/${id}/approve`);
export const rejectEnrollment = (id) => api.patch(`/enrollments/${id}/reject`);

// Student
export const enroll = (courseId) => api.post('/student/enroll', { courseId });
export const unenroll = (courseId) => api.delete(`/student/enroll/${courseId}`);
export const getMyEnrollments = () => api.get('/student/enrollments');

// Absences
export const getAbsences = (params) => api.get('/absences', { params });
export const reportTeacherAbsence = (data) => api.post('/absences/teacher', data);
export const recordStudentAbsences = (data) => api.post('/absences/students', data);

// Assignments
export const getAssignments = (params) => api.get('/assignments', { params });
export const createAssignment = (data) => api.post('/assignments', data);
export const deleteAssignment = (id) => api.delete(`/assignments/${id}`);
export const getDownloadUrl = (id) => api.get(`/assignments/${id}/download`);

// Files
export const getUploadUrl = (data) => api.post('/files/upload-url', data);

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');
export const broadcast = (data) => api.post('/notifications/broadcast', data);

// Stats
export const getStats = () => api.get('/stats');

// PDF
export const downloadAttestation = (studentId) =>
  api.get(`/pdf/attestation/${studentId}`, { responseType: 'blob' });
export const downloadCourseStudentsPdf = (courseId) =>
  api.get(`/pdf/course-students/${courseId}`, { responseType: 'blob' });
export const downloadSchedulePdf = (userId) =>
  api.get(`/pdf/schedule/${userId}`, { responseType: 'blob' });

// Teacher
export const getMyCourses = () => api.get('/teacher/my-courses');
export const updateProfile = (data) => api.patch('/teacher/profile', data);
