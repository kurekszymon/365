import { createFileRoute } from '@tanstack/react-router'
import { PresetGallery } from '#/components/editor/PresetGallery'

export const Route = createFileRoute('/')({ component: PresetGallery })
