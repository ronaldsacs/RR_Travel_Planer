const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves your HTML file

// --- DATABASE CONNECTION ---
// Replace with your actual MongoDB connection string later
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/travel_planner";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// --- DATABASE SCHEMAS ---
// Dynamic Schema to handle varied headers easily
const DynamicSchema = new mongoose.Schema({}, { strict: false });
const Visit = mongoose.model('Visit', DynamicSchema);
const Customer = mongoose.model('Customer', DynamicSchema);

// --- ROUTES ---

// 1. Get Data
app.get('/api/visits', async (req, res) => {
    const data = await Visit.find().sort({ _id: -1 });
    res.json(data);
});

app.get('/api/customers', async (req, res) => {
    const data = await Customer.find().sort({ _id: -1 });
    res.json(data);
});

// 2. Save Data (Add or Update)
app.post('/api/visits', async (req, res) => {
    const item = req.body;
    if (item._id) {
        await Visit.findByIdAndUpdate(item._id, item);
    } else {
        delete item._id; // Ensure no ID clash on create
        await Visit.create(item);
    }
    res.json({ message: "Saved" });
});

app.post('/api/customers', async (req, res) => {
    const item = req.body;
    if (item._id) {
        await Customer.findByIdAndUpdate(item._id, item);
    } else {
        delete item._id;
        await Customer.create(item);
    }
    res.json({ message: "Saved" });
});

// 3. Delete Data
app.delete('/api/visits/:id', async (req, res) => {
    await Visit.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

app.delete('/api/customers/:id', async (req, res) => {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

// 4. Excel Import (Server-Side)
app.post('/api/import', async (req, res) => {
    // In a real app, you'd use Multer to handle file uploads.
    // For this simplified version, we assume the frontend sends JSON 
    // OR you handle the file in frontend and send the parsed JSON array.
    // For now, let's rely on the frontend sending the parsed array of objects.
    const { type, data } = req.body;
    
    try {
        if (type === 'visits') {
            // Clear old and insert new or append? Let's append for now.
            // Remove IDs to let Mongo generate new ones
            const cleanData = data.map(d => ({ ...d, _id: undefined }));
            await Visit.insertMany(cleanData);
        } else {
            const cleanData = data.map(d => ({ ...d, _id: undefined }));
            await Customer.insertMany(cleanData);
        }
        res.json({ message: `Imported ${data.length} items` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
