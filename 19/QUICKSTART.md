# 🚀 Quick Start Guide - Notes App

Get up and running with the Notes App in 5 minutes!

## 1. Install Dependencies

```bash
yarn install
```

## 2. Configure PostHog (Optional)

Create a `.env` file in the `19/` directory:

```env
VITE_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
VITE_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

> **Note:** The app works without PostHog configured - events will just be logged to console.

## 3. Start the Dev Server

```bash
yarn dev
```

Open your browser to: **http://localhost:5173**

## 4. Add Sample Notes

1. You'll see the home page with stats showing 0 notes
2. Click the **"Add Sample Notes"** button
3. 8 sample notes will be created instantly

## 5. Test Cross-Tab Sync! 🔄

This is the cool part:

1. **Duplicate the tab** (Cmd+Click on macOS, or right-click → "Duplicate Tab")
2. In one tab, go to **"All Notes"** and click on any note
3. Click **"Edit"** and change the title or content
4. Click **"Save Changes"**
5. **Watch the other tab update instantly!** 🎉

You can also:
- Create a new note in one tab → appears immediately in all tabs
- Delete a note in one tab → disappears from all tabs
- Search/filter in multiple tabs independently

## 6. Monitor BroadcastChannel Messages

Go to the **Home** page to see:
- Current tab ID
- Recent broadcast messages between tabs
- Message types and payloads
- Real-time message counter

Click **"Test Broadcast"** to manually send a test message.

## 7. Check PostHog Events

If you configured PostHog:

1. Go to your PostHog dashboard
2. Navigate to **Events** or **Live Events**
3. Perform actions in the app:
   - Create a note
   - Search for notes
   - Click buttons
   - Switch pages
4. See events appear in real-time! 📊

All events are also logged to the browser console with `[Tracking]` prefix.

## 8. Explore Features

### Navigation
- **Home** - Overview, stats, and broadcast monitor
- **All Notes** - Browse, search, and filter all notes
- **New Note** - Create a new note
- **About** - Learn about the technologies used

### Search & Filter
On the "All Notes" page:
- Type in the search box to search across titles and content
- Click any tag to filter by that tag
- Click "Clear" to reset filters

### Creating Notes
1. Click "New Note" or the "+ Create New Note" button
2. Add a title (optional, defaults to "Untitled Note")
3. Write your content
4. Add tags by typing and pressing Enter
5. Click "Save Note"

### Editing Notes
1. Open any note
2. Click "Edit"
3. Make your changes
4. Click "Save Changes" or "Cancel"

### Deleting Notes
- From note list: Click the 🗑️ icon on any note card
- From note detail: Click the "Delete" button
- Confirmation dialog will appear

## 🎯 Pro Tips

### Test Multi-Tab Sync Like a Pro
1. Open 3-4 tabs with the app
2. Arrange them in a grid on your screen
3. Create/edit/delete notes and watch them sync everywhere
4. Open the Home page in one tab to monitor all messages

### PostHog Testing Ideas
- Create several notes to generate `note_created` events
- Search different queries to track search patterns
- Navigate between pages to see `page_viewed` events
- Click various buttons to see `button_clicked` events
- Monitor tab lifecycle with `tab_opened` and `tab_closed` events

### Development Mode
The app includes TanStack Router DevTools - look for the floating router icon in the bottom-right corner (only in dev mode).

## 🐛 Troubleshooting

### "BroadcastChannel not supported" warning?
Your browser doesn't support the BroadcastChannel API. The app will still work, but cross-tab sync won't function. Update to a modern browser:
- Chrome 54+
- Firefox 38+
- Safari 15.4+
- Edge 79+

### Notes not persisting?
Notes are stored in LocalStorage. Check that your browser:
- Has LocalStorage enabled
- Isn't in private/incognito mode
- Has available storage space

### PostHog events not showing?
- Check the browser console for `[Tracking]` logs
- Verify your PostHog API key is correct in `.env`
- Ensure the PostHog host URL is correct
- Check your PostHog project settings

### Build errors?
```bash
# Clear node_modules and reinstall
rm -rf node_modules
yarn install

# Clear Vite cache
rm -rf node_modules/.vite
yarn dev
```

## 📚 Next Steps

- Read the full [NOTES_APP_README.md](./NOTES_APP_README.md) for detailed documentation
- Explore the code in `/src/routes/` to see TanStack Router in action
- Check out `/src/lib/broadcast.ts` to understand cross-tab communication
- Review `/src/lib/tracking.ts` to see PostHog integration patterns

## 💡 Challenge Ideas

Want to extend the app? Try:
1. Add markdown support using a library like `react-markdown`
2. Implement note categories/folders
3. Add a note export feature (JSON/Markdown)
4. Create a dark/light mode toggle
5. Add keyboard shortcuts (Cmd+N for new note, etc.)
6. Implement drag-and-drop to reorder notes
7. Add a trash/archive feature with restore capability

---

Happy note-taking! 📝✨
