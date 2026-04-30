const Notification = require('../models/Notification');

const createNotification = async ({ recipient, course, type, title, message }) => {
  return Notification.create({ recipient, course, type, title, message });
};

// Crée une notification pour chaque élève d'un cours
const notifyCourseStudents = async (studentIds, { course, type, title, message }) => {
  const docs = studentIds.map(recipient => ({ recipient, course, type, title, message }));
  if (docs.length > 0) {
    await Notification.insertMany(docs);
  }
};

module.exports = { createNotification, notifyCourseStudents };
