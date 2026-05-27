import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Download, Upload, Trash2 } from "lucide-react"
import { useSettingsStore } from "@/stores/settings.store"
import { useProgressStore, getProgressSnapshot } from "@/stores/progress.store"
import { exportProgress, importProgress } from "@/lib/progress"
import type { SourceLanguage, UILanguage } from "@/lib/types"

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const sourceLanguage = useSettingsStore((s) => s.sourceLanguage)
  const setSourceLanguage = useSettingsStore((s) => s.setSourceLanguage)
  const uiLanguage = useSettingsStore((s) => s.uiLanguage)
  const setUILanguage = useSettingsStore((s) => s.setUILanguage)
  const resetProgress = useProgressStore((s) => s.resetProgress)
  const hydrate = useProgressStore((s) => s.hydrate)

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportProgress(getProgressSnapshot())
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lrn-a-lng-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importProgress(reader.result as string)
      if (result) {
        hydrate(result)
        setImportMessage(t("settings.importSuccess"))
      } else {
        setImportMessage(t("settings.importError"))
      }
      setTimeout(() => setImportMessage(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function handleUILanguageChange(lang: UILanguage) {
    setUILanguage(lang)
    i18n.changeLanguage(lang)
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">{t("settings.title")}</h1>

      <div className="flex flex-col gap-6">
        <div>
          <label className="text-sm font-medium text-slate-400 mb-2 block">
            {t("settings.sourceLanguage")}
          </label>
          <div className="flex gap-2">
            {(["pl", "en"] as SourceLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setSourceLanguage(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceLanguage === lang
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {t(`languages.${lang}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-400 mb-2 block">
            {t("settings.uiLanguage")}
          </label>
          <div className="flex gap-2">
            {(["en", "pl"] as UILanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleUILanguageChange(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uiLanguage === lang
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {t(`languages.${lang}`)}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-800" />

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Download size={18} />
            {t("settings.exportProgress")}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Upload size={18} />
            {t("settings.importProgress")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          {importMessage && (
            <p className="text-sm text-indigo-400">{importMessage}</p>
          )}
        </div>

        <hr className="border-slate-800" />

        {showResetConfirm ? (
          <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-950/30 border border-red-900/50">
            <p className="text-sm text-red-400">{t("settings.resetConfirm")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
              >
                {t("settings.resetCancel")}
              </button>
              <button
                onClick={() => {
                  resetProgress()
                  setShowResetConfirm(false)
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500"
              >
                {t("settings.resetConfirmBtn")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <Trash2 size={18} />
            {t("settings.resetProgress")}
          </button>
        )}
      </div>
    </div>
  )
}
