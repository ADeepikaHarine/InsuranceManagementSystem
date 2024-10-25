const mongoose = require('mongoose');

// Define the Feedback schema
const feedbackSchema = new mongoose.Schema({
    policyNumber: { type: String, required: true },
    userId: { type: String, required: true }, // Assuming you have user authentication in place
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create Feedback model
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
