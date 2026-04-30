const router = require('express').Router();
const { body, query } = require('express-validator');
const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('admin'));

// GET /api/accounting?page=1&type=income&category=inscription&from=2024-01-01&to=2024-12-31
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('createdBy', 'firstName lastName')
        .lean()
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ date: -1 }),
      Transaction.countDocuments(filter),
    ]);

    // Calcul des totaux sur la période filtrée (sans pagination)
    const totals = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);
    const income = totals.find(t => t._id === 'income')?.total || 0;
    const expense = totals.find(t => t._id === 'expense')?.total || 0;

    res.json({
      data: transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: { income, expense, balance: income - expense },
    });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/accounting/monthly — données mensuelles pour le graphique
router.get('/monthly', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);
    res.json(data);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/accounting
router.post('/', [
  body('type').isIn(['income', 'expense']),
  body('category').isIn(['inscription', 'salaire', 'materiel', 'autre']),
  body('amount').isFloat({ min: 0 }),
  body('description').trim().notEmpty().isLength({ max: 500 }),
  body('date').optional().isISO8601(),
], validate, async (req, res) => {
  try {
    const transaction = await Transaction.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(transaction);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/accounting/:id
router.delete('/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supprimé' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/accounting/export-pdf — export du rapport comptable
router.get('/export-pdf', async (req, res) => {
  try {
    const filter = {};
    if (req.query.from) filter.date = { ...filter.date, $gte: new Date(req.query.from) };
    if (req.query.to) filter.date = { ...filter.date, $lte: new Date(req.query.to) };

    const transactions = await Transaction.find(filter)
      .populate('createdBy', 'firstName lastName')
      .lean()
      .sort({ date: -1 });

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-comptable.pdf"');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('Rapport Comptable', { align: 'center' });
    doc.moveDown();
    if (req.query.from || req.query.to) {
      doc.fontSize(12).text(`Période : ${req.query.from || '...'} → ${req.query.to || '...'}`, { align: 'center' });
    }
    doc.moveDown();
    doc.fontSize(14).text(`Revenus : ${income.toFixed(2)} €`);
    doc.text(`Dépenses : ${expense.toFixed(2)} €`);
    doc.text(`Solde : ${(income - expense).toFixed(2)} €`);
    doc.moveDown();
    doc.fontSize(12).text('Détail des transactions :');
    doc.moveDown(0.5);

    transactions.forEach(t => {
      doc.text(
        `${new Date(t.date).toLocaleDateString('fr-FR')} | ${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)} € | ${t.category} | ${t.description}`,
        { indent: 10 }
      );
    });

    doc.end();
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
