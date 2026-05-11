import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import type { VenuePhoto } from "@/lib/venue/types"
import {
  deleteVenuePhoto,
  fetchVenuePhotos,
  getVenuePhotoUrl,
  uploadVenuePhoto,
} from "@/lib/venue/photoMutations"
import { Button } from "@/components/ui/button"

export function VenuePhotoGallery({ venueId }: { venueId: string }) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Array<VenuePhoto>>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchVenuePhotos(venueId, ctrl.signal)
      .then((data) => {
        setPhotos(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return
        setError(err.message)
        setLoading(false)
      })
    return () => ctrl.abort()
  }, [venueId])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const photo = await uploadVenuePhoto(venueId, file)
    setUploading(false)
    if (!photo) {
      setError(t("venue.photos.upload_error"))
    } else {
      setPhotos((prev) => [...prev, photo])
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async (photo: VenuePhoto) => {
    if (!window.confirm(t("venue.photos.delete_confirm"))) return
    const ok = await deleteVenuePhoto(photo.id, photo.storage_path)
    if (ok) setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("venue.photos.title")}</h2>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? t("venue.photos.uploading") : t("venue.photos.upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          {t("venue.photos.loading")}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && photos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("venue.photos.empty")}
        </p>
      )}

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              <img
                src={getVenuePhotoUrl(photo.storage_path)}
                alt=""
                className="h-24 w-24 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                className="absolute top-1 right-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
              >
                {t("venue.photos.delete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
