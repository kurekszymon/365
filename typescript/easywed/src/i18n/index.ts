import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import pl from "./locales/pl.json"
import { changelog } from "./locales/changelog"

// The changelog is its own namespace rather than more keys in the app's locale
// files: it is release notes on two marketing pages, it grows by a block with
// every release, and nothing in the app itself reads it. Referenced as
// `changelog:<key>` (or via `useTranslation("changelog")`), so the two never
// collide. The label on the menu entry that links to it stays in `translation`
// as `account.changelog` - that one is app chrome.
//
// See locales/changelog/index.ts: the namespace is assembled from one folder
// per release, so its strings group by version rather than by one long file.
const resources = {
  en: {
    translation: en,
    changelog: changelog.en,
  },
  pl: {
    translation: pl,
    changelog: changelog.pl,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "pl",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: true,
    },
  })

export default i18n
