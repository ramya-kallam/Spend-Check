# SpendCheck

A mobile application for tracking and analyzing personal expenses. Built using React Native for the frontend and Flask for the backend, with Firebase for user authentication and storage. The app leverages OCR technology and Gemini AI for smart expense categorization, analysis, and recommendations.

---

## ✨ Features

- 📌 **User Authentication** – Secure login using Firebase Authentication.
- 💸 **Add & Manage Transactions** – Manually enter or upload bills/receipts.
- 🧠 **AI-Powered Categorization** – Extract and categorize data from images or PDFs using Google Document AI.
- 🎙️ **Voice Input** – Add transactions using voice commands.
- 📊 **Expense Analysis** – Monthly/yearly insights via pie, bar, and line charts.
- 🔔 **Smart Notifications** – Alerts when 80% of income is spent or when the set spending limit for a particular category is being approached
- 📈 **Spending Trends** – Compare weekly and monthly spending patterns.
- 🎯 **Budget Tracking** – Set and monitor category-wise spending limits.
- 🤖 **AI Recommendations** – Personalized saving tips from Gemini AI based on spending behavior.

---

## Tech Stack

### Frontend:
- React Native

### Backend:
- Flask (Python)
- Firebase Firestore (Database)
- space.OCR API (Extraction of text from bills)
- Cloudinary (Storage of receipts uploaded by user)
- Gemini API