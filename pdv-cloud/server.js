const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados SQLite
const dbPath = path.resolve(__dirname, 'pdv_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Criação das Tabelas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      customerName TEXT,
      paymentMethod TEXT,
      paymentStatus TEXT,
      paidAmount REAL,
      changeAmount REAL,
      total REAL,
      items TEXT NOT NULL
    )
  `);
});

// --- ROTAS DA API ---

// PRODUTOS
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, price } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Dados incompletos' });

  db.run('INSERT INTO products (name, price) VALUES (?, ?)', [name, price], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, price });
  });
});

app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Produto removido com sucesso', id: req.params.id });
  });
});

// CLIENTES
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/customers', (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  db.run('INSERT INTO customers (name, phone) VALUES (?, ?)', [name, phone], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, phone });
  });
});

app.delete('/api/customers/:id', (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Cliente removido com sucesso', id: req.params.id });
  });
});

// VENDAS
app.get('/api/sales', (req, res) => {
  db.all('SELECT * FROM sales ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formattedSales = rows.map(sale => ({
      ...sale,
      items: JSON.parse(sale.items)
    }));
    res.json(formattedSales);
  });
});

app.post('/api/sales', (req, res) => {
  const { date, customerName, paymentMethod, paymentStatus, paidAmount, changeAmount, total, items } = req.body;
  const itemsJson = JSON.stringify(items);

  const sql = `
    INSERT INTO sales (date, customerName, paymentMethod, paymentStatus, paidAmount, changeAmount, total, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [date, customerName, paymentMethod, paymentStatus, paidAmount, changeAmount, total, itemsJson], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Venda salva na nuvem!' });
  });
});

app.patch('/api/sales/:id/status', (req, res) => {
  const { paymentStatus } = req.body;
  db.run('UPDATE sales SET paymentStatus = ? WHERE id = ?', [paymentStatus, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Status de pagamento atualizado' });
  });
});

// Iniciar o Servidor
app.listen(PORT, () => {
  console.log(`Servidor executando na porta ${PORT}`);
});