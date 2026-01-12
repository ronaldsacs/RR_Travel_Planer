const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet'); // Security header protection
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for bulk imports
app.use(express.static('public'));

// --- DB CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/travel_planner";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("DB Error:", err));

// --- SECURE SCHEMAS (Explicit Fields) ---
// This prevents vulnerabilities associated with arbitrary JSON keys
const visitSchema = new mongoose.Schema({
    "Sl.No": Number,
    "Customer Code": String,
    "COMPANY": String,
    "COUNTRY": String,
    "PLACE": String,
    "Customer Classification": String,
    "STREET": String,
    "Visit Plan": String,
    "Visit Date": Date,
    "No of Days Travel": Number,
    "Remarks": String,
    "Opportunities": String,
    "Opportunities Values I Euro": Number,
    "Action Plan": String,
    "Status": String,
    "PO": String,
    "Order Value": Number,
    "Audit Report": String
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
    "Sl.No": Number,
    "Customer Code": String,
    "COMPANY": String,
    "ADDRESS": String,
    "COUNTRY": String,
    "Service - Responsible": String,
    "80-20": String,
    "Annual Shut Down Planned": String,
    "Mechanical Audit Person": String,
    "Process Audit Date": Date,
    "Process Audit Person": String
}, { timestamps: true });

const Visit = mongoose.model('Visit', visitSchema);
const Customer = mongoose.model('Customer', customerSchema);

// --- ROUTES ---

// GET Visits/Customer
app.get('/api/visits', async (req, res) => {
    try {
        const data = await Visit.find().sort({ createdAt: -1 });
        res.json(data);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/customers', async (req, res) => {
    try {
        const data = await Customer.find().sort({ createdAt: -1 });
        res.json(data);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// SAVE (Create or Update)
app.post('/api/visits', async (req, res) => {
    try {
        const item = req.body;
        if (item._id) {
            await Visit.findByIdAndUpdate(item._id, item);
        } else {
            delete item._id;
            await Visit.create(item);
        }
        res.json({ success: true });
    } catch(e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
    try {
        const item = req.body;
        if (item._id) {
            await Customer.findByIdAndUpdate(item._id, item);
        } else {
            delete item._id;
            await Customer.create(item);
        }
        res.json({ success: true });
    } catch(e) { res.status(400).json({ error: e.message }); }
});

// DELETE
app.delete('/api/visits/:id', async (req, res) => {
    await Visit.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});
app.delete('/api/customers/:id', async (req, res) => {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// BULK IMPORT (Server-side Insertion)
app.post('/api/import', async (req, res) => {
    try {
        const { type, data } = req.body;
        // We rely on the Schema to filter out malicious keys
        if (type === 'visits') {
            await Visit.insertMany(data);
        } else {
            await Customer.insertMany(data);
        }
        res.json({ success: true, count: data.length });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: "Import failed. Check format." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
