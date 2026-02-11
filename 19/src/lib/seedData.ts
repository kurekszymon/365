// Seed data utility to populate the app with sample notes for testing

import { notesStore } from "./notes";

export const seedSampleNotes = () => {
  // Check if notes already exist
  if (notesStore.getNotesCount() > 0) {
    console.log("[SeedData] Notes already exist, skipping seed");
    return false;
  }

  console.log("[SeedData] Adding sample notes...");

  // Sample note 1: Getting Started
  notesStore.createNote(
    "Getting Started with Notes App",
    `Welcome to the Notes App! This is a sample note to help you get started.

Here are some things you can do:
- Create new notes with titles, content, and tags
- Search through your notes
- Filter by tags
- Edit and delete notes
- See real-time updates across browser tabs
- Add drawings and sketches to your notes!

Try opening this app in multiple tabs and creating a new note. You'll see it appear in all tabs instantly thanks to the BroadcastChannel API!`,
    ["welcome", "tutorial", "getting-started"],
  );

  // Sample note 2: Project Ideas
  notesStore.createNote(
    "Project Ideas for 2025",
    `Some interesting project ideas to explore:

1. Build a real-time collaborative editor
2. Create a personal knowledge base with backlinks
3. Develop a habit tracking app with analytics
4. Make a minimalist budgeting tool
5. Build a custom dashboard for daily metrics

These could all incorporate PostHog analytics to track engagement!`,
    ["ideas", "projects", "planning"],
  );

  // Sample note 3: Meeting Notes
  notesStore.createNote(
    "Team Meeting - Feb 7, 2025",
    `Attendees: Alice, Bob, Carol

Agenda:
- Q1 review
- New feature proposals
- Tech stack updates

Key Points:
- Analytics integration is working great
- Need to improve mobile experience
- Consider adding dark mode toggle

Action Items:
- @Alice: Research mobile optimization
- @Bob: Prototype dark mode
- @Carol: Analyze user metrics`,
    ["meeting", "work", "team"],
  );

  // Sample note 4: Code Snippets
  notesStore.createNote(
    "Useful Code Snippets",
    `// Quick array shuffle
const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Deep clone object
const clone = (obj) => JSON.parse(JSON.stringify(obj));

// Random ID generator
const id = () => crypto.randomUUID();`,
    ["code", "snippets", "javascript"],
  );

  // Sample note 5: Reading List
  notesStore.createNote(
    "Reading List",
    `Books to read:
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "The Pragmatic Programmer" by David Thomas
- "Clean Code" by Robert C. Martin

Articles:
- How React 19 improves performance
- Understanding BroadcastChannel API
- PostHog analytics best practices

Blogs to follow:
- Kent C. Dodds
- Dan Abramov
- Josh W. Comeau`,
    ["reading", "learning", "resources"],
  );

  // Sample note 6: Recipes
  notesStore.createNote(
    "Quick Pasta Recipe",
    `Ingredients:
- 400g pasta
- 3 cloves garlic
- 2 tbsp olive oil
- 1 cup cherry tomatoes
- Fresh basil
- Parmesan cheese
- Salt & pepper

Instructions:
1. Boil pasta according to package directions
2. Sauté garlic in olive oil until fragrant
3. Add cherry tomatoes, cook until soft
4. Toss with cooked pasta
5. Top with basil and parmesan
6. Season to taste

Cook time: 20 minutes
Serves: 4`,
    ["recipes", "cooking", "food"],
  );

  // Sample note 7: Workout Plan
  notesStore.createNote(
    "Weekly Workout Plan",
    `Monday: Upper Body
- Push-ups: 3x15
- Pull-ups: 3x8
- Dumbbell press: 3x12

Wednesday: Lower Body
- Squats: 3x15
- Lunges: 3x10 each leg
- Calf raises: 3x20

Friday: Core & Cardio
- Planks: 3x60s
- Mountain climbers: 3x30s
- 20 min run

Remember to stretch and stay hydrated!`,
    ["fitness", "health", "workout"],
  );

  // Sample note 8: Travel Plans
  notesStore.createNote(
    "Summer Vacation Ideas",
    `Destinations to consider:
🏖️ Beach: Bali, Maldives, Greece
🏔️ Mountains: Switzerland, New Zealand, Norway
🌆 Cities: Tokyo, Barcelona, New York

Budget: ~$3000 per person
Duration: 10-14 days
Best time: June-August

Things to book:
- Flights (3 months in advance)
- Hotels/Airbnb
- Activities/tours
- Travel insurance`,
    ["travel", "vacation", "planning"],
  );

  console.log("[SeedData] Successfully added 8 sample notes!");
  return true;
};

export const clearAllNotes = () => {
  if (
    window.confirm(
      "Are you sure you want to delete ALL notes? This cannot be undone.",
    )
  ) {
    notesStore.clearAll();
    console.log("[SeedData] All notes cleared");
    return true;
  }
  return false;
};
