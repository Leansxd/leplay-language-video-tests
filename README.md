# 🎬 Leplay - AI-Powered Language Learning

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F3B61F?style=for-the-badge&logo=google-gemini&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

Leplay is a modern, interactive web application designed to make English learning fun and engaging through YouTube video segments. Powered by AI, it automatically analyzes videos, extracts meaningful segments, and generates challenging quizzes.

## ✨ Key Features

-   **🎯 Frame-Perfect Sync**: Millisecond-level accuracy using the official YouTube IFrame API for seamless video control.
-   **🤖 AI Segmentation**: Automated extraction of high-quality learning segments using Groq (Llama 3.3).
-   **💎 Premium UI**: A modern, dark-mode-first interface with glassmorphism effects and smooth animations.
-   **🔄 Smart Shuffle**: Videos are randomly ordered every session using the Fisher-Yates algorithm.
-   **🌍 Subtitle Support**: Toggleable native YouTube captions for better comprehension.
-   **📈 Score System**: Earn points for correct answers and track your progress in real-time.

## 🛠 Tech Stack

-   **Frontend**: React, Vite, Framer Motion (Animations), Lucide React (Icons).
-   **AI Engine**: Node.js, Groq SDK (Llama 3.3), Youtube Transcript API.
-   **Styling**: Vanilla CSS with modern custom properties and glassmorphism.

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Setup Environment Variables**:
    Create a `.env` file in the root directory and add your Groq API key:
    ```env
    GROQ_API_KEY=your_api_key_here
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🎥 Adding Videos (AI Processor)

To populate the app with new content, run the AI processor script with a YouTube URL:

```bash
node scripts/processor.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

*The script will fetch English transcripts, use AI to identify 3-4 distinct segments across the video, generate Turkish translations with tricky distractors, and save them to `src/data/videos.json`.*

## 📂 Project Structure

-   `src/App.jsx`: Main application logic and video player integration.
-   `scripts/processor.js`: AI-powered script for data generation.
-   `src/data/videos.json`: Local database for processed video metadata.
-   `src/index.css`: Design system and global styles.

---
© 2026 Voscreen Clone - AI Language Learning Project.
