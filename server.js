const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// --- DB CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/travel_planner";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("DB Error:", err));

// --- SCHEMAS ---
const visitSchema = new mongoose.Schema({
    "Sl.No": Number,
    "Customer Code": { type: String, required: true },
    "COMPANY": { type: String, required: true },
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
    "Customer Code": { type: String, required: true, unique: true }, // Ensure unique codes
    "COMPANY": { type: String, required: true },
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

// GET Data
app.get('/api/visits', async (req, res) => {
    const data = await Visit.find().sort({ createdAt: -1 });
    res.json(data);
});

app.get('/api/customers', async (req, res) => {
    const data = await Customer.find().sort({ createdAt: -1 });
    res.json(data);
});

// NEW: Search Customer for Auto-Fill
app.get('/api/customers/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    // Search by Customer Code or Company
    const data = await Customer.find({
        $or: [
            { "Customer Code": { $regex: q, $options: 'i' } },
            { "COMPANY": { $regex: q, $options: 'i' } }
        ]
    }).limit(10);
    res.json(data);
});

// SAVE Data
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
        // Check for duplicates manually to give clean error
        if(!item._id) {
            const existing = await Customer.findOne({ "Customer Code": item["Customer Code"] });
            if(existing) return res.status(400).json({ error: "Customer Code already exists" });
        }

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

// BULK IMPORT (Robust)
app.post('/api/import', async (req, res) => {
    try {
        const { type, data } = req.body;
        if (!Array.isArray(data)) throw new Error("Data is not an array");

        // Clean data: remove _ids, ensure basic structure
        const cleanData = data.map(d => {
            const doc = { ...d };
            delete doc._id; 
            delete doc.createdAt;
            delete doc.updatedAt;
            return doc;
        });

        let result;
        if (type === 'visits') {
            // Validate required fields before inserting
            const valid = cleanData.filter(d => d["Customer Code"] && d["COMPANY"]);
            result = await Visit.insertMany(valid);
        } else {
            const valid = cleanData.filter(d => d["Customer Code"] && d["COMPANY"]);
            // Use ordered: false to skip errors if duplicates exist in import
            result = await Customer.insertMany(valid, { ordered: false }); 
        }
        res.json({ success: true, count: result.length });
    } catch(e) {
        console.error("Import Error:", e);
        res.status(500).json({ error: "Import failed. Check format or duplicates." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
