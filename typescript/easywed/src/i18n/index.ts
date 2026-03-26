import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import pl from "./locales/pl.json"

const resources = {
  en: {
    translation: en,
  },
  pl: {
    translation: pl,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: true,
    },
  })

export default i18n
