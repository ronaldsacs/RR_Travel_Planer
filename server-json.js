const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURATION ---
// All data will be stored in this file
const DATA_FILE = path.join(__dirname, 'data.json');

// Helper: Read Data from File
function readDB() {
    if (!fs.existsSync(DATA_FILE)) {
        // Create default file with admin user if not exists
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

// Helper: Save Data to File
function writeDB(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- AUTH ROUTES ---

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    
    // Simple password check (for demo purposes)
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { id: user.id, email: user.email } });
    } else {
        res.status(400).json({ error: "Invalid email or password" });
    }
});

app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    
    // Check if user exists
    const exists = db.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ error: "User already exists" });

    const newUser = { id: Date.now(), email, password };
    db.users.push(newUser);
    writeDB(db);
    
    res.json({ success: true, user: { id: newUser.id, email: newUser.email } });
});

// --- DATA ROUTES ---

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

// SAVE
app.post('/api/visits', (req, res) => {
    const db = readDB();
    const item = req.body;
    
    if (item._id) {
        // Update
        const index = db.visits.findIndex(v => v._id == item._id);
        if (index !== -1) db.visits[index] = { ...item, updatedAt: Date.now() };
    } else {
        // Create
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
    
    // Attach user ID and IDs to imported items
    const cleanData = data.map(item => ({
        ...item, 
        _id: Date.now() + Math.random(), // Generate unique ID
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
    console.log(`Database file: ${DATA_FILE}`);
});
