import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ReviewTemplate from '../models/ReviewTemplate.model.js';

dotenv.config();

const defaultTemplates = [
  {
    title: 'Excellent Course',
    templateText: 'This course was excellent! The content was well-structured and the instructor explained everything clearly. I learned a lot and would highly recommend it to others.',
    category: 'positive',
    order: 1,
    isActive: true
  },
  {
    title: 'Good Content',
    templateText: 'Good course with useful content. The topics were covered comprehensively and the examples were helpful. Would be great to have more practical exercises.',
    category: 'positive',
    order: 2,
    isActive: true
  },
  {
    title: 'Very Helpful',
    templateText: 'Very helpful course! The instructor was knowledgeable and the materials were well-prepared. I was able to apply what I learned in my work.',
    category: 'positive',
    order: 3,
    isActive: true
  },
  {
    title: 'Decent Course',
    templateText: 'A decent course overall. The content was good but could be more interactive. Some sections could use more detailed explanations.',
    category: 'neutral',
    order: 4,
    isActive: true
  },
  {
    title: 'Informative',
    templateText: 'Informative course that covered the basics well. Good for beginners. Could benefit from more advanced topics for experienced learners.',
    category: 'neutral',
    order: 5,
    isActive: true
  },
  {
    title: 'Needs Improvement',
    templateText: 'The course was okay but had some areas that could be improved. The content was somewhat outdated and more practical examples would help.',
    category: 'negative',
    order: 6,
    isActive: true
  }
];

async function seedReviewTemplates() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('Connected to MongoDB');

    // Clear existing templates
    await ReviewTemplate.deleteMany({});
    console.log('Cleared existing templates');

    // Insert default templates
    const templates = await ReviewTemplate.insertMany(defaultTemplates);
    console.log(`Seeded ${templates.length} review templates`);

    console.log('Review templates seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedReviewTemplates();