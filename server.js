const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware for parsing request bodies (JSON & URL-encoded)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/insuranceDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Mongoose schemas and models
const policySchema = new mongoose.Schema({
    policyNumber: String,
    policyHolderName: String,
    coverageAmount: Number,
    policyType: String,
    startDate: Date,
    endDate: Date,
});

const claimSchema = new mongoose.Schema({
    policyName: String,
    claimAmount: Number,
    status: { type: String, default: 'Pending' } // New field for status
});

const claimSubmitSchema = new mongoose.Schema({
    claimId: String,
    claimHolder: String,
    policyNumber: String,
    claimAmount: Number,
    claimDescription: String,
});

const feedbackSchema = new mongoose.Schema({
    policyNumber: { type: String, required: true },
    userId: { type: String, required: true }, // Assuming you have user authentication in place
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create models
const Policy = mongoose.model('Policy', policySchema);
const Claim = mongoose.model('Claim', claimSchema);
const ClaimSubmit = mongoose.model('ClaimSubmit', claimSubmitSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema); // Feedback model

// API endpoint to add a new policy
app.post('/add-policy', (req, res) => {
    const { policyNumber, policyHolderName, coverageAmount, policyType, startDate, endDate } = req.body;

    const newPolicy = new Policy({
        policyNumber,
        policyHolderName,
        coverageAmount,
        policyType,
        startDate,
        endDate,
    });

    newPolicy.save()
        .then(() => {
            io.emit('new-policy', newPolicy);  // Emit real-time policy updates
            res.json({ message: 'Policy added successfully!' });
        })
        .catch(err => res.status(500).json({ error: 'Error adding policy' }));
});

// API endpoint to get all policies
app.get('/policies', (req, res) => {
    Policy.find()
        .then(policies => res.json(policies))
        .catch(err => res.status(500).json({ error: 'Error fetching policies' }));
});

// API endpoint to delete a policy
app.delete('/api/policies/:id', (req, res) => {
    Policy.findByIdAndDelete(req.params.id)
        .then(() => res.json({ success: true, message: 'Policy deleted successfully!' }))
        .catch(err => res.status(500).json({ error: 'Failed to delete policy.' }));
});

// API endpoint to add a new claim
app.post('/add-claim', (req, res) => {
    const newClaim = new Claim({
        policyName: req.body.policyName,
        claimAmount: req.body.claimAmount
    });

    newClaim.save()
        .then(() => res.json({ message: 'Claim submitted successfully!' }))
        .catch(err => res.status(400).json({ error: err.message }));
});

// API endpoint to get all claims
app.get('/claims', (req, res) => {
    Claim.find()
        .then(claims => res.json(claims))
        .catch(err => res.status(400).json({ error: err.message }));
});

// New API endpoint for submitting a claim (from the form in the frontend)
app.post('/submit-claim', (req, res) => {
    const { claimId, claimHolder, policyNumber, claimAmount, claimDescription } = req.body;

    // Process the claim and store it in the database
    const newClaimSubmit = new ClaimSubmit({
        claimId,
        claimHolder,
        policyNumber,
        claimAmount,
        claimDescription
    });

    newClaimSubmit.save()
        .then(() => {
            res.json({
                success: true,
                message: 'Claim submitted successfully!'
            });
        })
        .catch(err => {
            res.status(500).json({
                success: false,
                message: 'Failed to submit claim.',
                error: err.message
            });
        });
});

// API endpoint to submit feedback
app.post('/submit-feedback', (req, res) => {
    const { policyNumber, userId, rating, comment } = req.body;

    const newFeedback = new Feedback({
        policyNumber,
        userId,
        rating,
        comment,
    });

    newFeedback.save()
        .then(() => res.json({ message: 'Feedback submitted successfully!' }))
        .catch(err => res.status(400).json({ error: 'Failed to submit feedback', details: err.message }));
});

// API endpoint to get feedback for a specific policy
app.get('/feedback/:policyNumber', (req, res) => {
    Feedback.find({ policyNumber: req.params.policyNumber })
        .then(feedback => res.json(feedback))
        .catch(err => res.status(500).json({ error: 'Error fetching feedback' }));
});

// Real-time communication using Socket.io
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send all policies when requested
    socket.on('request-policies', async () => {
        const policies = await Policy.find();
        socket.emit('policies', policies);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
