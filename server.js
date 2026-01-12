const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// --- CONFIGURATION ---
const DATA_FILE = path.join(__dirname, 'data.json');

// Helper: Read DB
function readDB() {
    if (!fs.existsSync(DATA_FILE)) {
        // Create default file with Admin
        const initialData = {
            users: [
                { id: 1, email: 'admin@travelplanner.com', password: 'password123' }
            ],
            visits: [],
            customers: []
        };
        writeDB(initialData);
        return initialData;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// Helper: Write DB
function writeDB(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- AUTH ROUTES ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, user: { id: user.id, email: user.email } });
    } else {
        res.status(400).json({ error: "Invalid email or password" });
    }
});

// --- DATA ROUTES ---

// GET: Visits & Customers
app.get('/api/visits', (req, res) => {
    const db = readDB();
    const userId = req.query.userId;
    const userVisits = db.visits.filter(v => v.createdBy == userId);
    res.json(userVisits);
});

app.get('/api/customers', (req, res) => {
    const db = readDB();
    const userId = req.query.userId;
    const userCustomers = db.customers.filter(c => c.createdBy == userId);
    res.json(userCustomers);
});

// GET: Dashboard Data (KPIs)
app.get('/api/kpi', (req, res) => {
    const db = readDB();
    const userId = req.query.userId;
    
    const userVisits = db.visits.filter(v => v.createdBy == userId);
    
    const totalVisits = userVisits.length;
    const totalOpp = userVisits.reduce((sum, v) => sum + (parseFloat(v["Opportunities Values I Euro"]) || 0), 0);
    const totalOrder = userVisits.reduce((sum, v) => sum + (parseFloat(v["Order Value"]) || 0), 0);
    
    res.json({
        totalVisits,
        totalOpp,
        totalOrder
    });
});

// SAVE (Visits & Customers)
app.post('/api/visits', (req, res) => {
    const db = readDB();
    const item = req.body;
    
    if (item._id) {
        const index = db.visits.findIndex(v => v._id == item._id);
        if (index !== -1) db.visits[index] = { ...item, updatedAt: Date.now() };
    } else {
        delete item._id;
        db.visits.push({ ...item, _id: Date.now(), createdAt: Date.now() });
    }
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/customers', (req, res) => {
    const db = readDB();
    const item = req.body;
    
    if (item._id) {
        const index = db.customers.findIndex(c => c._id == item._id);
        if (index !== -1) db.customers[index] = { ...item, updatedAt: Date.now() };
    } else {
        delete item._id;
        db.customers.push({ ...item, _id: Date.now(), createdAt: Date.now() });
    }
    writeDB(db);
    res.json({ success: true });
});

// DELETE
app.delete('/api/visits/:id', (req, res) => {
    const db = readDB();
    db.visits = db.visits.filter(v => v._id != req.params.id);
    writeDB(db);
    res.json({ success: true });
});

app.delete('/api/customers/:id', (req, res) => {
    const db = readDB();
    db.customers = db.customers.filter(c => c._id != req.params.id);
    writeDB(db);
    res.json({ success: true });
});

// IMPORT
app.post('/api/import', (req, res) => {
    const db = readDB();
    const { type, data, userId } = req.body;
    
    const cleanData = data.map(item => ({
        ...item, 
        _id: Date.now() + Math.random(), 
        createdBy: userId, 
        createdAt: Date.now()
    }));

    if (type === 'visits') {
        db.visits = [...db.visits, ...cleanData];
    } else {
        db.customers = [...db.customers, ...cleanData];
    }
    writeDB(db);
    res.json({ success: true, count: cleanData.length });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
