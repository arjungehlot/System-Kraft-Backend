require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const Contact = require('./models/Contact');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!mongoUri) {
  console.error('MongoDB URI is not defined in .env file');
  process.exit(1);
}

// Ensure the URI has a database name, otherwise append /system_kraft
let finalMongoUri = mongoUri;
if (mongoUri.endsWith('.net') || mongoUri.endsWith('.net/')) {
  finalMongoUri = mongoUri.endsWith('/') ? `${mongoUri}system_kraft` : `${mongoUri}/system_kraft`;
} else if (mongoUri.includes('?')) {
  // If it has query params like ?appName=Cluster0, we need to inject the db name before the query string
  const [base, query] = mongoUri.split('?');
  if (base.endsWith('.net') || base.endsWith('.net/')) {
    finalMongoUri = base.endsWith('/') ? `${base}system_kraft?${query}` : `${base}/system_kraft?${query}`;
  }
}

mongoose.connect(finalMongoUri)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.post('/api/contact', async (req, res) => {
  try {
    const { name, company, email, phone, industry, requirementType, details } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !requirementType || !details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a new contact entry
    const newContact = new Contact({
      name,
      company,
      email,
      phone,
      industry,
      requirementType,
      details
    });

    // Save to database
    await newContact.save();

    // Set up nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'arjungehlot552@gmail.com',
      subject: `New Contact Request from ${name}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0056b3;">
            <h2 style="color: #0056b3; margin: 0;">New Contact Request</h2>
            <p style="color: #666; margin: 5px 0 0 0;">You have received a new consultation request</p>
          </div>
          
          <div style="padding: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333; width: 35%;">Name</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Company</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">${company || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Email</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #0056b3;"><a href="mailto:${email}" style="color: #0056b3; text-decoration: none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Phone</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Industry</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">${industry || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Requirement Type</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">
                  <span style="background-color: #e3f2fd; color: #0056b3; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${requirementType}</span>
                </td>
              </tr>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #ffffff; border-left: 4px solid #0056b3; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Details:</h4>
              <p style="margin: 0; color: #555; line-height: 1.5; white-space: pre-wrap;">${details}</p>
            </div>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px;">
            <p style="margin: 0;">This email was sent automatically from your website's contact form.</p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // We log the error but still return success since it's saved in DB
    }

    res.status(201).json({ message: 'Contact form submitted successfully' });
  } catch (error) {
    console.error('Error saving contact form:', error);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
