const transporter = require('../config/email');

const FROM = process.env.EMAIL_FROM || 'noreply@ecole.fr';

const sendWelcomeTeacher = async ({ email, firstName, tempPassword }) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Bienvenue sur la plateforme Eford - Vos identifiants',
    html: `
      <h2>Bienvenue ${firstName},</h2>
      <p>Votre compte enseignant a été créé sur la plateforme Eford.</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Mot de passe temporaire :</strong> ${tempPassword}</p>
      <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>
    `,
  });
};

const sendEnrollmentResult = async ({ email, firstName, courseTitle, status }) => {
  const isApproved = status === 'approved';
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Inscription ${isApproved ? 'approuvée' : 'refusée'} - ${courseTitle}`,
    html: `
      <h2>Bonjour ${firstName},</h2>
      <p>Votre demande d'inscription au cours <strong>${courseTitle}</strong> a été
        <strong>${isApproved ? 'approuvée' : 'refusée'}</strong>.
      </p>
      ${isApproved ? '<p>Vous pouvez dès à présent accéder à vos cours.</p>' : ''}
    `,
  });
};

const sendTeacherAbsenceNotification = async ({ email, firstName, courseTitle, date }) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Cours annulé - ${courseTitle}`,
    html: `
      <h2>Bonjour ${firstName},</h2>
      <p>Le cours <strong>${courseTitle}</strong> du
        <strong>${new Date(date).toLocaleDateString('fr-FR')}</strong>
        est annulé en raison de l'absence de l'enseignant.
      </p>
    `,
  });
};

const sendNewAssignment = async ({ email, firstName, courseTitle, assignmentTitle }) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Nouveau devoir - ${courseTitle}`,
    html: `
      <h2>Bonjour ${firstName},</h2>
      <p>Un nouveau devoir <strong>${assignmentTitle}</strong> a été publié dans le cours
        <strong>${courseTitle}</strong>.
      </p>
      <p>Connectez-vous sur la plateforme pour le consulter.</p>
    `,
  });
};

module.exports = {
  sendWelcomeTeacher,
  sendEnrollmentResult,
  sendTeacherAbsenceNotification,
  sendNewAssignment,
};
