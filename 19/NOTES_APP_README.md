# 📝 Notes App - React 19 + TanStack Router + PostHog

A modern, feature-rich note-taking application built to demonstrate real-time cross-tab communication, analytics tracking, and modern React patterns.

## ✨ Features

### Core Functionality
- **Create, Read, Update, Delete Notes** - Full CRUD operations with a clean interface
- **Tagging System** - Organize notes with custom tags
- **Search & Filter** - Instantly search through notes by content or filter by tags
- **Persistent Storage** - All notes stored in browser's LocalStorage
- **Real-time Sync** - Changes automatically sync across all open tabs using BroadcastChannel API

### Technology Highlights
- **React 19** - Latest React with improved performance
- **TanStack Router** - Type-safe, file-based routing
- **PostHog Analytics** - Comprehensive event tracking and user analytics
- **BroadcastChannel API** - Native browser cross-tab communication
- **TypeScript** - Full type safety throughout the application
- **Vite** - Lightning-fast development and build tooling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn 4.x (configured via packageManager in package.json)

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

The app will be available at `http://localhost:5173`

## 🎯 Usage Guide

### First Time Setup

1. **Add Sample Notes**: When you first open the app, click "Add Sample Notes" on the home page to populate it with example notes
2. **Explore Features**: Navigate through the app using the top navigation bar
3. **Test Cross-Tab Sync**: Open the app in multiple browser tabs and create/edit notes to see real-time synchronization

### Creating Notes

1. Click "New Note" in the navigation or the "Create New Note" button
2. Enter a title and content
3. Add tags by typing and pressing Enter or clicking "Add Tag"
4. Click "Save Note" to create the note

### Searching & Filtering

- Use the search box on the "All Notes" page to search by title, content, or tags
- Click on any tag to filter notes by that specific tag
- Click "Clear" to reset filters

### Real-time Sync Demo

1. Open the app in two browser tabs side by side
2. Create, edit, or delete a note in one tab
3. Watch the changes appear instantly in the other tab
4. Check the "BroadcastChannel Monitor" on the home page to see message events

## 📊 PostHog Analytics

The app tracks the following events for analytics:

### Note Events
- `note_created` - When a new note is created
- `note_updated` - When a note is edited
- `note_deleted` - When a note is removed
- `note_viewed` - When a note is opened
- `note_searched` - When search is performed

### Navigation Events
- `page_viewed` - Page view tracking
- `route_changed` - Route change tracking

### BroadcastChannel Events
- `broadcast_message_sent` - When a message is broadcast to other tabs
- `broadcast_message_received` - When a message is received from another tab
- `tab_opened` - When a new tab is opened
- `tab_closed` - When a tab is closed

### UI Interaction Events
- `button_clicked` - Button click tracking
- `search_performed` - Search queries
- `tag_filtered` - Tag filter usage

## 🏗️ Project Structure

```
src/
├── components/          # Reusable React components (currently empty, can be expanded)
├── lib/                 # Core utilities and logic
│   ├── broadcast.ts    # BroadcastChannel manager
│   ├── notes.ts        # Notes storage and management
│   ├── tracking.ts     # PostHog tracking utilities
│   └── seedData.ts     # Sample data generator
├── routes/             # TanStack Router file-based routes
│   ├── __root.tsx      # Root layout with navigation
│   ├── index.tsx       # Home page
│   ├── about.tsx       # About page
│   ├── notes.tsx       # Notes list page
│   ├── notes.$noteId.tsx # Individual note page
│   └── new.tsx         # Create new note page
├── routeTree.gen.ts    # Auto-generated router tree
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## 🔧 Key Components

### BroadcastChannel Manager (`lib/broadcast.ts`)
Handles cross-tab communication:
- Singleton instance ensures single channel per tab
- Event listener system for message types
- Automatic tab lifecycle tracking
- Type-safe message payload handling

### Notes Store (`lib/notes.ts`)
LocalStorage-backed note management:
- CRUD operations for notes
- Search and filter functionality
- Tag management
- Automatic persistence

### Tracking Utility (`lib/tracking.ts`)
PostHog analytics integration:
- Type-safe event constants
- Helper methods for common tracking scenarios
- Automatic metadata attachment
- Error tracking support

## 🎨 Styling

The app uses a custom CSS design system with:
- CSS custom properties for theming
- Automatic dark mode support via `prefers-color-scheme`
- Responsive design for mobile and desktop
- Accessible color contrast ratios
- Smooth transitions and animations

## 🌐 Browser Compatibility

### Required Features
- LocalStorage API - All modern browsers
- BroadcastChannel API - Chrome 54+, Firefox 38+, Safari 15.4+, Edge 79+

### Progressive Enhancement
If BroadcastChannel is not supported:
- The app still works fully for single-tab usage
- A warning is displayed on the home page
- Analytics events still track properly

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Or use the EU cloud:
```env
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
VITE_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

## 🧪 Testing PostHog Integration

1. **Check Console**: All PostHog events are logged to the console
2. **PostHog Dashboard**: View events in real-time at posthog.com
3. **Broadcast Monitor**: The home page shows all cross-tab messages with timestamps

### Example Events to Track:
- Create a note → `note_created` event
- Search for notes → `search_performed` event  
- Open another tab → `tab_opened` + `broadcast_message_received` events
- Delete a note → `note_deleted` event in all tabs

## 🚧 Future Enhancements

Potential features to add:
- [ ] Note categories/folders
- [ ] Markdown support in note content
- [ ] Export notes as JSON/Markdown
- [ ] Import notes from files
- [ ] Dark mode toggle (currently auto)
- [ ] Note sharing via URL
- [ ] Collaboration features with WebSockets
- [ ] Offline-first with Service Workers
- [ ] Full-text search with highlighting
- [ ] Note versioning/history

## 🐛 Known Issues

- None currently! 🎉

## 📚 Learning Resources

This app demonstrates:
- React 19 features and patterns
- TanStack Router v1 file-based routing
- BroadcastChannel API usage
- PostHog analytics integration
- TypeScript best practices
- LocalStorage data persistence
- Modern CSS with custom properties
- Responsive design patterns

## 📄 License

This is a learning project - feel free to use and modify as needed!

## 🙏 Acknowledgments

- [React](https://react.dev/)
- [TanStack Router](https://tanstack.com/router)
- [PostHog](https://posthog.com/)
- [Vite](https://vitejs.dev/)
- [MDN Web Docs](https://developer.mozilla.org/) for BroadcastChannel API documentation

---

Built with ❤️ as part of a 365-day programming learning journey.
