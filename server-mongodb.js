const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE (Must be at the TOP) ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Essential for receiving JSON data
app.use(express.static('public'));

// --- DB CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/travel_planner";
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log("✅ MongoDB Connected");
      seedDefaultAdmin(); 
  })
  .catch(err => {
      console.error("❌ DB Connection Error:", err);
      process.exit(1); // Stop server if DB fails
  });

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const visitSchema = new mongoose.Schema({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// --- SEED DEFAULT ADMIN (With Logs) ---
async function seedDefaultAdmin() {
    const adminEmail = "admin@travelplanner.com";
    const adminPassword = "password123"; 

    try {
        console.log("🔍 Checking if admin exists...");
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
            console.log("⚠️ Admin not found. Creating...");
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const newAdmin = new User({
                email: adminEmail,
                password: hashedPassword
            });
            await newAdmin.save();
            console.log("--------------------------------------------------");
            console.log("🚀 DEFAULT ADMIN USER CREATED:");
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: ${adminPassword}`);
            console.log("--------------------------------------------------");
        } else {
            console.log("✅ Admin user already exists in database.");
        }
    } catch (error) {
        console.error("❌ Error seeding admin user:", error);
    }
}

// --- RESET ROUTE (Use this if login fails) ---
app.get('/api/debug-reset', async (req, res) => {
    try {
        await User.deleteMany({});
        console.log("Database wiped.");
        await seedDefaultAdmin();
        res.send("Database reset and Admin recreated. You can now login.");
    } catch(e) {
        res.status(500).send("Error resetting: " + e.message);
    }
});

// --- AUTH ROUTES (With Debug Logs) ---

app.post('/api/register', async (req, res) => {
    console.log("📝 Register Request:", req.body.email);
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword });
        console.log("✅ User Registered:", user.email);
        res.json({ success: true, user: { id: user._id, email: user.email } });
    } catch (e) {
        console.error("❌ Register Error:", e.message);
        res.status(400).json({ error: "Email already exists or invalid data" });
    }
});

app.post('/api/login', async (req, res) => {
    console.log("🔑 Login Attempt:", req.body.email);
    
    try {
        const { email, password } = req.body;
        
        // 1. Find User
        const user = await User.findOne({ email });
        if (!user) {
            console.log("❌ User not found for email:", email);
            return res.status(400).json({ error: "User not found" });
        }
        console.log("✅ User found. Comparing password...");

        // 2. Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Password mismatch.");
            return res.status(400).json({ error: "Invalid password" });
        }

        console.log("✅ Login Successful!");
        res.json({ success: true, user: { id: user._id, email: user.email } });
    } catch (e) {
        console.error("❌ Server Error during login:", e);
        res.status(500).json({ error: "Server error" });
    }
});

// --- DATA ROUTES ---

app.get('/api/visits', async (req, res) => {
    const userId = req.query.userId; 
    if (!userId) return res.status(401).json({ error: "Unauthorized: No userId" });
    const data = await Visit.find({ createdBy: userId }).sort({ createdAt: -1 });
    res.json(data);
});

app.get('/api/customers', async (req, res) => { // Fixed typo from customers -> customers
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized: No userId" });
    const data = await Customer.find({ createdBy: userId }).sort({ createdAt: -1 });
    res.json(data);
});

// SAVE
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

app.post('/api/customers', async (req, res) => { // Fixed typo
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

// IMPORT
app.post('/api/import', async (req, res) => {
    try {
        const { type, data, userId } = req.body;
        const cleanData = data.map(item => ({ ...item, createdBy: userId }));

        if (type === 'visits') {
            await Visit.insertMany(cleanData);
        } else {
            await Customer.insertMany(cleanData);
        }
        res.json({ success: true, count: cleanData.length });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: "Import failed." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
