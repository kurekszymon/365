import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';
import { tracking } from '../lib/tracking';
import { broadcastManager } from '../lib/broadcast';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  const posthog = usePostHog();

  useEffect(() => {
    tracking.setPostHog(posthog);
    tracking.trackPageView('/about');
  }, [posthog]);

  return (
    <div className="about-page">
      <div className="page-header">
        <h1>About Notes App</h1>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>📝 What is this?</h2>
          <p>
            This is a modern note-taking application built to demonstrate several web
            technologies working together seamlessly. It's designed to be simple,
            fast, and provide real-time synchronization across browser tabs.
          </p>
        </section>

        <section className="about-section">
          <h2>🛠️ Technologies Used</h2>
          <ul className="tech-list">
            <li>
              <strong>React 19</strong> - Latest version of React with improved
              performance and new features
            </li>
            <li>
              <strong>TanStack Router</strong> - Type-safe routing for React
              applications with file-based routing
            </li>
            <li>
              <strong>PostHog</strong> - Product analytics platform for tracking user
              interactions and understanding app usage
            </li>
            <li>
              <strong>BroadcastChannel API</strong> - Native browser API for
              cross-tab/window communication
            </li>
            <li>
              <strong>LocalStorage</strong> - Browser storage for persisting notes
              offline
            </li>
            <li>
              <strong>TypeScript</strong> - Type-safe JavaScript for better developer
              experience
            </li>
            <li>
              <strong>Vite</strong> - Lightning-fast build tool and dev server
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h2>✨ Features</h2>
          <ul className="features-list">
            <li>
              <strong>Create & Edit Notes:</strong> Simple interface for managing your
              notes with title, content, and tags
            </li>
            <li>
              <strong>Search & Filter:</strong> Quickly find notes by searching content
              or filtering by tags
            </li>
            <li>
              <strong>Real-time Sync:</strong> Changes are instantly synchronized across
              all open tabs using BroadcastChannel API
            </li>
            <li>
              <strong>Offline Support:</strong> All notes are stored in your browser's
              LocalStorage
            </li>
            <li>
              <strong>Analytics Tracking:</strong> PostHog integration tracks user
              interactions for insights
            </li>
            <li>
              <strong>Type Safety:</strong> Full TypeScript support for better code
              quality
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h2>🔄 BroadcastChannel API</h2>
          <p>
            The BroadcastChannel API allows different tabs, windows, and workers from
            the same origin to communicate with each other. This app uses it to sync
            note changes in real-time across all open instances.
          </p>
          <div className="info-box">
            <p>
              <strong>Try it out:</strong> Open this app in multiple browser tabs and
              create, edit, or delete notes. You'll see the changes instantly reflected
              in all tabs!
            </p>
          </div>
          <p>
            <strong>Browser Support:</strong>{' '}
            {broadcastManager.isSupported() ? (
              <span className="status-badge status-success">
                ✅ Your browser supports BroadcastChannel
              </span>
            ) : (
              <span className="status-badge status-error">
                ❌ Your browser doesn't support BroadcastChannel
              </span>
            )}
          </p>
        </section>

        <section className="about-section">
          <h2>📊 PostHog Analytics</h2>
          <p>
            This app uses PostHog to track various events and user interactions,
            including:
          </p>
          <ul className="analytics-list">
            <li>Note creation, updates, and deletions</li>
            <li>Page views and route changes</li>
            <li>Search queries and tag filters</li>
            <li>BroadcastChannel messages sent and received</li>
            <li>Button clicks and UI interactions</li>
            <li>Tab opening and closing events</li>
          </ul>
          <p>
            These analytics help understand how users interact with the app and
            identify areas for improvement.
          </p>
        </section>

        <section className="about-section">
          <h2>🎯 Purpose</h2>
          <p>
            This project is part of a learning journey to explore modern web
            technologies and concepts. It serves as a practical example of:
          </p>
          <ul>
            <li>Building a complete CRUD application</li>
            <li>Implementing real-time cross-tab communication</li>
            <li>Integrating analytics and tracking</li>
            <li>Using modern React patterns and TypeScript</li>
            <li>Creating a clean, responsive user interface</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>💾 Data Storage</h2>
          <div className="info-box info-box-warning">
            <p>
              <strong>Important:</strong> All your notes are stored locally in your
              browser's LocalStorage. This means:
            </p>
            <ul>
              <li>Your data never leaves your device</li>
              <li>Notes are private to your browser</li>
              <li>Clearing browser data will delete your notes</li>
              <li>Notes won't sync across different browsers or devices</li>
            </ul>
          </div>
        </section>

        <section className="about-section">
          <h2>🚀 Get Started</h2>
          <p>
            Ready to start taking notes? Head over to the{' '}
            <a href="/new" className="link">
              New Note
            </a>{' '}
            page to create your first note, or check out{' '}
            <a href="/notes" className="link">
              All Notes
            </a>{' '}
            to see your collection.
          </p>
        </section>
      </div>
    </div>
  );
}
