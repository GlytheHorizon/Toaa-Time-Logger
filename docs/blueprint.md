# **App Name**: TimeLogger Pro

## Core Features:

- Google Authentication: Secure user authentication using Google Sign-In with Firebase Auth, enabling users to log in and log out.
- Personalized Dashboard: Display a personalized dashboard for each user, showing total required hours (400), completed hours, remaining hours, days completed, weeks completed, estimated completion date, and a progress bar.
- Automatic Time Tracking: Automatically calculate daily, weekly, and total hours worked based on a preset schedule. Start date January 26, 2026.
- Hour Limit Enforcement: Prevent logging hours beyond the allowed daily limit based on the set work schedule. Automatically stop counting once 400 hours is reached. Monday, Tuesday, Thursday, Friday, and Saturday are 8 hours days. Wednesday is 4 hours. No work is scheduled for Sunday.
- Data Storage: Store user hours and progress in Firebase Firestore, ensuring private data for each user.
- Estimated Completion Date Tool: Use generative AI to estimate when the user will hit 400 hours of time tracking, considering work schedule and any logged days or hours toward that 400-hour goal.

## Style Guidelines:

- Primary color: Dark violet (#7951A8) to evoke a sense of sophistication and focus.
- Background color: Dark grayish-violet (#262429) for a calming, focused atmosphere.
- Accent color: Light lavender (#B497D6) to create contrast and highlight important elements.
- Body font: 'Inter', a sans-serif font known for its modern and neutral appearance, perfect for the internship time tracker app.
- Headline font: 'Space Grotesk', a sans-serif font for clear and modern headers and titles.
- Use simple, minimalist icons for dashboard elements to maintain a clean and beginner-friendly UI.
- Implement a clean, well-spaced dashboard layout that is easy to navigate. Prioritize key metrics like total hours and progress.
- Incorporate subtle transitions and animations for a smoother user experience, such as progress bar updates.