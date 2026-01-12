const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// --- DB CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/travel_planner";
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log("MongoDB Connected");
      seedDefaultAdmin(); // <--- RUN THE SEED FUNCTION HERE
  })
  .catch(err => console.error("DB Error:", err));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const visitSchema = new mongoose.Schema({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to User
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to User
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

// --- AUTO-CREATE DEFAULT ADMIN ---
async function seedDefaultAdmin() {
    const adminEmail = "ronaldsacs@gmail.com";
    const adminPassword = "!@123Kadant"; // Change this if you want a different default

    try {
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
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
            console.log("✅ Admin user already exists.");
        }
    } catch (error) {
        console.error("Error seeding admin user:", error);
    }
}

// --- ROUTES ---

app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword });
        res.json({ success: true, user: { id: user._id, email: user.email } });
    } catch (e) {
        res.status(400).json({ error: "Email already exists or invalid data" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid password" });

        res.json({ success: true, user: { id: user._id, email: user.email } });
    } catch (e) {
        res.status(500).json({ error: "Login error" });
    }
});

// ... (KEEP THE REST OF YOUR ROUTES THE SAME: /visits, /customers, etc.) ...

// Helper to get user data based on stored ID
app.get('/api/visits', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const data = await Visit.find({ createdBy: userId }).sort({ createdAt: -1 });
    res.json(data);
});

app.get('/api/customers', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const data = await Customer.find({ createdBy: userId }).sort({ createdAt: -1 });
    res.json(data);
});

// SAVE (Create/Update)
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

// BULK IMPORT
app.post('/api/import', async (req, res) => {
    try {
        const { type, data, userId } = req.body;
        
        // Attach userId to all imported items
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
    console.log(`Server running on http://localhost:${PORT}`);
});
