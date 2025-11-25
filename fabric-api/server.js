const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/landrecords');
    // console.log('Connected to MongoDB');
  } catch (error) {
    // console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// LandRequest Schema
const landRequestSchema = new mongoose.Schema({
  txnId: {
    type: String,
    sparse: true,
  },
  nature: {
    type: String,
    enum: ['electronic', 'physical'],
    default: 'electronic',
  },
  createdBy: {
    type: String,
    required: true,
  },
  // Personal Details
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  aadharNumber: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  // Land Registration Details
  ownerName: {
    type: String,
    required: true,
  },
  surveyNumber: {
    type: String,
    required: true,
  },
  area: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  documentUrl: String,
  receiptUrl: String,
  pattaUrl: String,
  ipfsHash: String,
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['submitted', 'with_clerk', 'with_superintendent', 'with_projectofficer', 'with_vro', 'with_surveyor', 'with_revenueinspector', 'with_mro', 'with_revenuedeptofficer', 'with_jointcollector', 'with_districtcollector', 'with_ministrywelfare', 'completed', 'rejected'],
    default: 'submitted',
  },
  currentlyWith: String,
  // Patta Certificate Fields
  pattaHash: String,
  pattaNumber: String,
  certificateNumber: String,
  pattaGeneratedAt: Date,
  pattaHtmlContent: String,
  // Additional Fields for Patta
  fatherName: String,
  aadhaar: String,
  district: String,
  mandal: String,
  village: String,
  // Survey Data
  surveyData: {
    pointA: {
      lat: Number,
      long: Number,
    },
    pointB: {
      lat: Number,
      long: Number,
    },
    pointC: {
      lat: Number,
      long: Number,
    },
    pointD: {
      lat: Number,
      long: Number,
    },
    measuredArea: String,
    boundaryMapHash: String,
    surveyDate: Date,
  },
  fieldPhotos: [String],
  surveyRemarks: String,
  // Action History
  actionHistory: [
    {
      transactionId: {
        type: String,
        required: true,
        index: true,
      },
      officialId: String,
      officialName: String,
      designation: String,
      action: {
        type: String,
        enum: ['approved', 'rejected', 'data_added', 'forwarded'],
      },
      remarks: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      data: mongoose.Schema.Types.Mixed,
      documents: [{
        fileName: String,
        fileType: String,
        ipfsHash: String,
        uploadedAt: { type: Date, default: Date.now },
        size: Number,
      }],
    },
  ],
  compNo: String,
  fileNo: String,
  subject: String,
  sentTo: String,
  dueOn: Date,
}, {
  timestamps: true,
});

// Generate receipt number before saving
landRequestSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    this.receiptNumber = require('crypto').randomBytes(5).toString('hex').toUpperCase();
  }
  next();
});

const LandRequest = mongoose.model('LandRequest', landRequestSchema);

// Routes
app.get('/api/landrequests', async (req, res) => {
  try {
    const { status, receiptNumber, ownerName } = req.query;
    let query = {};

    if (status) query.status = status;
    if (receiptNumber) query.receiptNumber = new RegExp(receiptNumber, 'i');
    if (ownerName) query.ownerName = new RegExp(ownerName, 'i');

    const landRequests = await LandRequest.find(query).sort({ createdAt: -1 });
    res.json(landRequests);
  } catch (error) {
    console.error('Error fetching land requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/landrequests/:id', async (req, res) => {
  try {
    const landRequest = await LandRequest.findById(req.params.id);
    if (!landRequest) {
      return res.status(404).json({ error: 'Land request not found' });
    }
    res.json(landRequest);
  } catch (error) {
    console.error('Error fetching land request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/landrequests', async (req, res) => {
  try {
    const landRequest = new LandRequest(req.body);
    await landRequest.save();
    res.status(201).json(landRequest);
  } catch (error) {
    console.error('Error creating land request:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Receipt number already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/landrequests/:id', async (req, res) => {
  try {
    const landRequest = await LandRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!landRequest) {
      return res.status(404).json({ error: 'Land request not found' });
    }
    res.json(landRequest);
  } catch (error) {
    console.error('Error updating land request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/landrequests/:id', async (req, res) => {
  try {
    const landRequest = await LandRequest.findByIdAndDelete(req.params.id);
    if (!landRequest) {
      return res.status(404).json({ error: 'Land request not found' });
    }
    res.json({ message: 'Land request deleted successfully' });
  } catch (error) {
    console.error('Error deleting land request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Fabric API running on port ${PORT}`);
  });
}

startServer().catch(console.error);