<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NInput,
  NButton,
  NTabs,
  NTabPane,
  NGrid,
  NGridItem,
  NCard,
  NTag,
  NRadioGroup,
  NRadioButton,
  NSlider,
  NSelect,
  NSwitch,
  useMessage
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import ImageSvgPanel from '../components/image-tools/ImageSvgPanel.vue'
import ImageBatchPanel from '../components/image-tools/ImageBatchPanel.vue'
import ImageComparePanel from '../components/image-tools/ImageComparePanel.vue'
import ImageInfoPanel from '../components/image-tools/ImageInfoPanel.vue'
import ImageDataUrlPanel from '../components/image-tools/ImageDataUrlPanel.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { useKeyboardShortcut, isModKey } from '../composables/useKeyboardShortcut'
import { useTabNavigation } from '../composables/useTabNavigation'
import { useIpc } from '../composables/useIpc'
import { useSharedImageState, type PickedImage } from '../composables/useSharedImageState'
import {
  IMAGE_TOOLS_TAB_STORAGE_KEY,
  formatBytes,
  type ImageInfo,
  type CompressOptions,
  type ResizeOptions,
  type ImageConvertOptions,
  type ProcessedImage,
  type ExtractedColor,
  type IconGenerateResult
} from '@dev-tool-kit/shared'

const message = useMessage()
const page = useToolI18n('imageTools')
const { copy } = useCopyToClipboard()
const { invoke } = useIpc()
const { pickedImage, imageLoading, infoData, pickImage, saveProcessedImage } = useSharedImageState()

// ─── Tab / Category management ───────────────────────────────────────────────

const VALID_TABS = ['base64', 'info', 'dataUrl', 'compress', 'resize', 'svg', 'convert', 'color', 'favicon', 'batch', 'compare', 'preset'] as const
type TabName = (typeof VALID_TABS)[number]

type CategoryName = 'basic' | 'optimize' | 'convert' | 'batch'

const TAB_CATEGORIES: Record<CategoryName, readonly TabName[]> = {
  basic: ['base64', 'info', 'dataUrl'],
  optimize: ['compress', 'resize', 'svg', 'favicon'],
  convert: ['convert', 'color', 'compare', 'preset'],
  batch: ['batch']
}

const {
  activeTab,
  activeCategory,
  showTab
} = useTabNavigation({
  validTabs: VALID_TABS,
  tabCategories: TAB_CATEGORIES,
  defaultCategory: 'basic',
  storageKey: IMAGE_TOOLS_TAB_STORAGE_KEY
})

// ─── Drag & Drop ──────────────────────────────────────────────────────────

const isDragOver = ref(false)

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]
  if (!file.type.startsWith('image/')) {
    message.error(page.t('messages.imageLoadFailed'))
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1] ?? ''
    const dataUri = reader.result as string
    const img: PickedImage = {
      fileName: file.name,
      filePath: '',
      mimeType: file.type,
      base64,
      dataUri,
      size: file.size
    }
    pickedImage.value = img
    message.success(page.t('messages.imageLoaded'))

    // Auto-populate base64 tab
    base64FileName.value = file.name
    base64Mime.value = file.type
    base64Data.value = base64
    base64DataUri.value = dataUri
    base64FileSize.value = file.size
    decodeMime.value = file.type
    decodeInput.value = base64
  }
  reader.readAsDataURL(file)
}

// ─── Clipboard paste ──────────────────────────────────────────────────────

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] ?? ''
        const dataUri = reader.result as string
        const img: PickedImage = {
          fileName: `clipboard-${Date.now()}.png`,
          filePath: '',
          mimeType: item.type,
          base64,
          dataUri,
          size: file.size
        }
        pickedImage.value = img
        message.success(page.t('messages.clipboardImageLoaded'))

        base64FileName.value = img.fileName
        base64Mime.value = img.mimeType
        base64Data.value = base64
        base64DataUri.value = dataUri
        base64FileSize.value = file.size
        decodeMime.value = img.mimeType
        decodeInput.value = base64
      }
      reader.readAsDataURL(file)
      break
    }
  }
}

// ─── Base64 Tab ──────────────────────────────────────────────────────────────

const base64Data = ref('')
const base64Mime = ref('image/png')
const base64DataUri = ref('')
const base64FileSize = ref(0)
const base64FileName = ref('')

const decodeMime = ref('image/png')
const decodeInput = ref('')

const decodePreviewUri = computed(() => {
  const raw = decodeInput.value.trim()
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  const mime = decodeMime.value.trim() || 'image/png'
  const base64 = raw.replace(/^data:[^;]+;base64,/, '')
  return `data:${mime};base64,${base64}`
})

const decodePreviewVisible = computed(() => Boolean(decodePreviewUri.value))

async function pickImageForBase64() {
  const data = await pickImage()
  if (!data) return
  base64FileName.value = data.fileName
  base64Mime.value = data.mimeType
  base64Data.value = data.base64
  base64DataUri.value = data.dataUri
  base64FileSize.value = data.size
  decodeMime.value = data.mimeType
  decodeInput.value = data.base64
}

async function copyBase64() {
  if (!base64Data.value) return
  await copy(base64Data.value, page.t('messages.imageCopied'))
}

async function copyDataUri() {
  if (!base64DataUri.value) return
  await copy(base64DataUri.value, page.t('messages.imageCopied'))
}

function useForDecode() {
  if (base64Data.value) {
    decodeInput.value = base64Data.value
    decodeMime.value = base64Mime.value
  }
}

// ─── Compress Tab ────────────────────────────────────────────────────────────

const compressFormat = ref<'jpeg' | 'webp' | 'png'>('jpeg')
const compressQuality = ref(80)
const compressPalette = ref(false)
const compressResult = ref<ProcessedImage | null>(null)
const compressLoading = ref(false)

const compressOriginalPreviewUri = computed(() => pickedImage.value?.dataUri ?? '')

const compressRatio = computed(() => {
  if (!compressResult.value || !pickedImage.value) return ''
  const original = pickedImage.value.size
  const compressed = compressResult.value.size
  const ratio = ((1 - compressed / original) * 100).toFixed(1)
  return `${ratio}%`
})

const compressFormatOptions = computed(() => [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
  { label: 'PNG', value: 'png' }
])

async function pickImageForCompress() {
  compressResult.value = null
  await pickImage()
}

async function handleCompress() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  compressLoading.value = true
  try {
    const options: CompressOptions = {
      format: compressFormat.value,
      quality: compressFormat.value === 'png' ? 80 : compressQuality.value,
      palette: compressFormat.value === 'png' ? compressPalette.value : undefined
    }
    const result = await invoke<ProcessedImage | null>('image-tools:compress', pickedImage.value.filePath, options)
    if (result) {
      compressResult.value = result
      message.success(page.t('messages.compressSuccess'))
    } else {
      message.error(page.t('messages.compressFailed'))
    }
  } catch {
    message.error(page.t('messages.compressFailed'))
  } finally {
    compressLoading.value = false
  }
}

async function saveCompressed() {
  if (!compressResult.value) return
  await saveProcessedImage(compressResult.value)
}

// ─── Resize Tab ──────────────────────────────────────────────────────────────

const resizeMode = ref<'preset' | 'custom'>('preset')
const resizePreset = ref<string | null>('avatar')
const resizeCustomWidth = ref<number | null>(null)
const resizeCustomHeight = ref<number | null>(null)
const resizeLockAspect = ref(true)
const resizeFit = ref<'cover' | 'contain' | 'fill' | 'inside' | 'outside'>('cover')
const resizeWithoutEnlargement = ref(false)
const resizeResult = ref<ProcessedImage | null>(null)
const resizeLoading = ref(false)

const resizeOriginalPreviewUri = computed(() => pickedImage.value?.dataUri ?? '')

const presetSizeOptions = computed(() => [
  { label: page.t('presetSizes.favicon32'), value: 'favicon32' },
  { label: page.t('presetSizes.favicon64'), value: 'favicon64' },
  { label: page.t('presetSizes.icon128'), value: 'icon128' },
  { label: page.t('presetSizes.icon512'), value: 'icon512' },
  { label: page.t('presetSizes.avatar'), value: 'avatar' },
  { label: page.t('presetSizes.ogImage'), value: 'ogImage' },
  { label: page.t('presetSizes.thumbnail'), value: 'thumbnail' },
  { label: page.t('presetSizes.socialCover'), value: 'socialCover' }
])

const PRESET_DIMENSIONS: Record<string, { width: number; height: number }> = {
  favicon32: { width: 32, height: 32 },
  favicon64: { width: 64, height: 64 },
  icon128: { width: 128, height: 128 },
  icon512: { width: 512, height: 512 },
  avatar: { width: 256, height: 256 },
  ogImage: { width: 1200, height: 630 },
  thumbnail: { width: 150, height: 150 },
  socialCover: { width: 1640, height: 856 }
}

const fitOptions = computed(() => [
  { label: page.t('labels.fitCover'), value: 'cover' },
  { label: page.t('labels.fitContain'), value: 'contain' },
  { label: page.t('labels.fitFill'), value: 'fill' },
  { label: page.t('labels.fitInside'), value: 'inside' },
  { label: page.t('labels.fitOutside'), value: 'outside' }
])

function handleResizeWidthInput(val: string) {
  const w = parseInt(val, 10)
  resizeCustomWidth.value = isNaN(w) ? null : w
  if (resizeLockAspect.value && pickedImage.value && resizeCustomWidth.value && infoData.value?.width && infoData.value?.height) {
    const origW = infoData.value?.width ?? 1
    const origH = infoData.value?.height ?? 1
    resizeCustomHeight.value = Math.round((resizeCustomWidth.value / origW) * origH)
  }
}

function handleResizeHeightInput(val: string) {
  const h = parseInt(val, 10)
  resizeCustomHeight.value = isNaN(h) ? null : h
  if (resizeLockAspect.value && pickedImage.value && resizeCustomHeight.value && infoData.value?.width && infoData.value?.height) {
    const origW = infoData.value?.width ?? 1
    const origH = infoData.value?.height ?? 1
    resizeCustomWidth.value = Math.round((resizeCustomHeight.value / origH) * origW)
  }
}

async function pickImageForResize() {
  resizeResult.value = null
  const data = await pickImage()
  if (!data) return
  // Fetch info for aspect ratio calculations
  try {
    const info = await invoke<ImageInfo | null>('image-tools:getInfo', data.filePath)
    infoData.value = info ?? null
  } catch {
    // Non-critical — proceed without info
  }
}

async function handleResize() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  let targetWidth: number | undefined
  let targetHeight: number | undefined

  if (resizeMode.value === 'preset' && resizePreset.value) {
    const dims = PRESET_DIMENSIONS[resizePreset.value]
    if (dims) {
      targetWidth = dims.width
      targetHeight = dims.height
    }
  } else {
    targetWidth = resizeCustomWidth.value ?? undefined
    targetHeight = resizeCustomHeight.value ?? undefined
  }

  if (!targetWidth && !targetHeight) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }

  resizeLoading.value = true
  try {
    const options: ResizeOptions = {
      width: targetWidth,
      height: targetHeight,
      fit: resizeFit.value,
      withoutEnlargement: resizeWithoutEnlargement.value || undefined
    }
    const result = await invoke<ProcessedImage | null>('image-tools:resize', pickedImage.value.filePath, options)
    if (result) {
      resizeResult.value = result
      message.success(page.t('messages.resizeSuccess'))
    } else {
      message.error(page.t('messages.resizeFailed'))
    }
  } catch {
    message.error(page.t('messages.resizeFailed'))
  } finally {
    resizeLoading.value = false
  }
}

async function saveResized() {
  if (!resizeResult.value) return
  await saveProcessedImage(resizeResult.value)
}

// ─── Convert Tab ─────────────────────────────────────────────────────────────

const convertTargetFormat = ref<'png' | 'jpeg' | 'webp'>('png')
const convertBackground = ref('#ffffff')
const convertQuality = ref(90)
const convertResult = ref<ProcessedImage | null>(null)
const convertLoading = ref(false)

const convertOriginalPreviewUri = computed(() => pickedImage.value?.dataUri ?? '')

const sourceHasAlpha = computed(() => {
  if (!pickedImage.value) return false
  return pickedImage.value.mimeType === 'image/png' || pickedImage.value.mimeType === 'image/webp'
})

const convertFormatOptions = computed(() => [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' }
])

async function pickImageForConvert() {
  convertResult.value = null
  await pickImage()
}

async function handleConvert() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  convertLoading.value = true
  try {
    const options: ImageConvertOptions = {
      format: convertTargetFormat.value,
      quality: convertTargetFormat.value !== 'png' ? convertQuality.value : undefined,
      background: convertTargetFormat.value === 'jpeg' && sourceHasAlpha.value ? convertBackground.value : undefined
    }
    const result = await invoke<ProcessedImage | null>('image-tools:convert', pickedImage.value.filePath, options)
    if (result) {
      convertResult.value = result
      message.success(page.t('messages.convertSuccess'))
    } else {
      message.error(page.t('messages.convertFailed'))
    }
  } catch {
    message.error(page.t('messages.convertFailed'))
  } finally {
    convertLoading.value = false
  }
}

async function saveConverted() {
  if (!convertResult.value) return
  await saveProcessedImage(convertResult.value)
}

const router = useRouter()
const colorPickedHex = ref('')
const colorPickedRgb = ref<{ r: number; g: number; b: number } | null>(null)
const colorPickedHsl = ref<{ h: number; s: number; l: number } | null>(null)
const colorExtractedColors = ref<ExtractedColor[]>([])
const colorExtracting = ref(false)

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function handleImageClick(e: MouseEvent) {
  const img = e.currentTarget as HTMLImageElement
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)

  const rect = img.getBoundingClientRect()
  const scaleX = img.naturalWidth / rect.width
  const scaleY = img.naturalHeight / rect.height
  const x = Math.floor((e.clientX - rect.left) * scaleX)
  const y = Math.floor((e.clientY - rect.top) * scaleY)

  const pixel = ctx.getImageData(x, y, 1, 1).data
  const r = pixel[0], g = pixel[1], b = pixel[2]

  colorPickedRgb.value = { r, g, b }
  colorPickedHex.value = rgbToHex(r, g, b)
  colorPickedHsl.value = rgbToHsl(r, g, b)
  message.success(page.t('messages.colorPicked'))
}

async function pickImageForColor() {
  colorPickedHex.value = ''
  colorPickedRgb.value = null
  colorPickedHsl.value = null
  colorExtractedColors.value = []
  await pickImage()
}

async function loadFromClipboard() {
  try {
    const data = await invoke<{ base64: string; dataUri: string; width: number; height: number; size: number; mimeType: string } | null>('image-tools:readClipboardImage')
    if (data) {
      pickedImage.value = {
        fileName: 'clipboard.png',
        filePath: '',
        mimeType: data.mimeType,
        base64: data.base64,
        dataUri: data.dataUri,
        size: data.size
      }
      colorPickedHex.value = ''
      colorPickedRgb.value = null
      colorPickedHsl.value = null
      message.success(page.t('messages.clipboardImageLoaded'))
    } else {
      message.warning(page.t('messages.clipboardNoImage'))
    }
  } catch {
    message.error(page.t('messages.clipboardNoImage'))
  }
}

async function handleExtractColors() {
  if (!pickedImage.value?.filePath) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  colorExtracting.value = true
  try {
    const colors = await invoke<ExtractedColor[] | null>('image-tools:extractColors', pickedImage.value.filePath, 8)
    if (colors && colors.length > 0) {
      colorExtractedColors.value = colors
      message.success(page.t('messages.colorExtracted'))
    } else {
      colorExtractedColors.value = []
      message.warning(page.t('messages.colorExtractFailed'))
    }
  } catch {
    message.error(page.t('messages.colorExtractFailed'))
  } finally {
    colorExtracting.value = false
  }
}

function goToColorConverter() {
  router.push('/color-converter')
}

// ─── Favicon Tab ──────────────────────────────────────────────────────────

const faviconPreset = ref<'webFavicon' | 'appIcon' | 'pwa' | 'allSizes'>('webFavicon')
const faviconIncludeIco = ref(true)
const faviconResult = ref<IconGenerateResult | null>(null)
const faviconLoading = ref(false)

const ICON_PRESET_CONFIG: Record<string, { sizes: number[]; includeIco: boolean }> = {
  webFavicon: { sizes: [16, 32, 48], includeIco: true },
  appIcon: { sizes: [57, 60, 72, 76, 114, 120, 144, 152, 180], includeIco: false },
  pwa: { sizes: [72, 96, 128, 144, 152, 192, 384, 512], includeIco: false },
  allSizes: { sizes: [16, 32, 48, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512], includeIco: true }
}

const faviconPresetOptions = computed(() => [
  { label: page.t('iconPresets.webFavicon'), value: 'webFavicon' },
  { label: page.t('iconPresets.appIcon'), value: 'appIcon' },
  { label: page.t('iconPresets.pwa'), value: 'pwa' },
  { label: page.t('iconPresets.allSizes'), value: 'allSizes' }
])

async function pickImageForFavicon() {
  faviconResult.value = null
  await pickImage()
}

async function handleGenerateIcons() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  faviconLoading.value = true
  try {
    const preset = ICON_PRESET_CONFIG[faviconPreset.value]
    const result = await invoke<IconGenerateResult | null>('image-tools:generateIcons',
      pickedImage.value.filePath,
      preset.sizes,
      faviconIncludeIco.value && preset.includeIco
    )
    if (result) {
      faviconResult.value = result
      message.success(page.t('messages.iconGenerateSuccess'))
    } else {
      message.error(page.t('messages.iconGenerateFailed'))
    }
  } catch {
    message.error(page.t('messages.iconGenerateFailed'))
  } finally {
    faviconLoading.value = false
  }
}

async function saveFaviconIcons() {
  if (!faviconResult.value) return
  const images: Array<{ data: string; fileName: string }> = faviconResult.value.icons.map(icon => ({
    data: icon.data,
    fileName: icon.fileName
  }))
  if (faviconResult.value.ico) {
    images.push({ data: faviconResult.value.ico.data, fileName: faviconResult.value.ico.fileName })
  }
  try {
    const result = await invoke<{ success: boolean }>('image-tools:saveImages', images)
    if (result?.success) {
      message.success(page.t('messages.batchSaveSuccess'))
    } else {
      message.error(page.t('messages.batchSaveFailed'))
    }
  } catch {
    message.error(page.t('messages.batchSaveFailed'))
  }
}

const presetLoading = ref(false)
const presetResult = ref<ProcessedImage | null>(null)

interface PresetConfig {
  key: string
  operation: 'compress' | 'resize' | 'convert'
  compressOptions?: CompressOptions
  resizeOptions?: ResizeOptions
  convertOptions?: ImageConvertOptions
}

const ENCODE_PRESETS: PresetConfig[] = [
  {
    key: 'presetWeb',
    operation: 'compress',
    compressOptions: { format: 'webp', quality: 80 }
  },
  {
    key: 'presetAvatar',
    operation: 'resize',
    resizeOptions: { width: 256, height: 256, fit: 'cover' }
  },
  {
    key: 'presetAppIcon',
    operation: 'compress',
    compressOptions: { format: 'png', quality: 80 }
  },
  {
    key: 'presetEcommerce',
    operation: 'resize',
    resizeOptions: { width: 800, height: 800, fit: 'cover' }
  },
  {
    key: 'presetOg',
    operation: 'resize',
    resizeOptions: { width: 1200, height: 630, fit: 'cover' }
  }
]

async function pickImageForPreset() {
  presetResult.value = null
  await pickImage()
}

async function applyPreset(preset: PresetConfig) {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  presetLoading.value = true
  try {
    let result: ProcessedImage | null = null
    switch (preset.operation) {
      case 'compress':
        result = await invoke<ProcessedImage | null>('image-tools:compress', pickedImage.value.filePath, preset.compressOptions!) ?? null
        break
      case 'resize':
        result = await invoke<ProcessedImage | null>('image-tools:resize', pickedImage.value.filePath, preset.resizeOptions!) ?? null
        break
      case 'convert':
        result = await invoke<ProcessedImage | null>('image-tools:convert', pickedImage.value.filePath, preset.convertOptions!) ?? null
        break
    }
    if (result) {
      presetResult.value = result
      message.success(page.t('messages.presetApplySuccess'))
    } else {
      message.error(page.t('messages.presetApplyFailed'))
    }
  } catch {
    message.error(page.t('messages.presetApplyFailed'))
  } finally {
    presetLoading.value = false
  }
}

async function savePresetResult() {
  if (!presetResult.value) return
  await saveProcessedImage(presetResult.value)
}

// ─── Keyboard shortcut ───────────────────────────────────────────────────────

function runActiveTabPrimaryAction() {
  switch (activeTab.value) {
    case 'base64':
      pickImageForBase64()
      break
    case 'compress':
      handleCompress()
      break
    case 'resize':
      handleResize()
      break
    case 'convert':
      handleConvert()
      break
    case 'color':
      pickImageForColor()
      break
    case 'favicon':
      pickImageForFavicon()
      break
    case 'preset':
      pickImageForPreset()
      break
  }
}

useKeyboardShortcut((event) => {
  if (isModKey(event) && event.key === 'Enter') {
    event.preventDefault()
    runActiveTabPrimaryAction()
  }
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="image-tools-view page-container--wide"
  >
    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragOver }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @paste="handlePaste"
    >
      <NRadioGroup
        v-model:value="activeCategory"
        class="category-tabs"
      >
        <NRadioButton value="basic">
          {{ page.t('categories.basic') }}
        </NRadioButton>
        <NRadioButton value="optimize">
          {{ page.t('categories.optimize') }}
        </NRadioButton>
        <NRadioButton value="convert">
          {{ page.t('categories.convert') }}
        </NRadioButton>
        <NRadioButton value="batch">
          {{ page.t('categories.batch') }}
        </NRadioButton>
      </NRadioGroup>

      <NTabs
        v-model:value="activeTab"
        type="line"
        animated
        class="converter-tabs"
      >
        <!-- ─── Base64 Tab ──────────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('base64')"
          name="base64"
          :tab="page.t('tabs.base64')"
        >
          <div class="image-base64-panel">
            <NCard
              class="editor-card"
              :bordered="false"
            >
              <template #header>
                <div class="card-header-flex">
                  <span class="card-title">{{ page.t('labels.imageToBase64') }}</span>
                  <NTag
                    v-if="base64FileName"
                    size="small"
                    :bordered="false"
                  >
                    {{ base64FileName }}
                  </NTag>
                </div>
              </template>
              <div class="image-actions">
                <NButton
                  type="primary"
                  :loading="imageLoading"
                  @click="pickImageForBase64"
                >
                  {{ page.t('actions.pickImage') }}
                </NButton>
                <NButton
                  v-if="base64Data"
                  @click="copyBase64"
                >
                  {{ page.t('actions.copyBase64') }}
                </NButton>
                <NButton
                  v-if="base64DataUri"
                  @click="copyDataUri"
                >
                  {{ page.t('actions.copyDataUri') }}
                </NButton>
                <NButton
                  v-if="base64Data"
                  quaternary
                  @click="useForDecode"
                >
                  {{ page.t('actions.useForDecode') }}
                </NButton>
              </div>
              <div
                v-if="base64Data"
                class="image-meta"
              >
                <span>{{ page.t('labels.mimeType') }}: {{ base64Mime }}</span>
                <span>{{ page.t('labels.fileSize') }}: {{ formatBytes(base64FileSize) }}</span>
              </div>
              <NInput
                v-if="base64Data"
                v-model:value="base64Data"
                type="textarea"
                readonly
                :rows="6"
                class="code-input image-base64-output"
              />
            </NCard>

            <NCard
              class="editor-card"
              :bordered="false"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.base64ToImage') }}</span>
              </template>
              <div class="decode-mime-row">
                <span class="section-label">{{ page.t('labels.mimeType') }}</span>
                <NInput
                  v-model:value="decodeMime"
                  :placeholder="page.t('placeholders.mimeType')"
                  style="max-width: 220px"
                />
              </div>
              <NInput
                v-model:value="decodeInput"
                type="textarea"
                :rows="5"
                :placeholder="page.t('placeholders.imageBase64')"
                class="code-input"
              />
              <div
                v-if="decodePreviewVisible"
                class="image-preview-wrap"
              >
                <img
                  :src="decodePreviewUri"
                  :alt="page.t('labels.preview')"
                  class="image-preview"
                >
              </div>
              <p
                v-else-if="decodeInput.trim()"
                class="preview-hint"
              >
                {{ page.t('messages.invalidImageBase64') }}
              </p>
            </NCard>
          </div>
        </NTabPane>

        <!-- ─── Info / EXIF Tab ──────────────────────────────────────────── -->
        <ImageInfoPanel v-if="showTab('info')" />
        <NTabPane
          v-if="showTab('compress')"
          name="compress"
          :tab="page.t('tabs.compress')"
        >
          <div class="action-bar">
            <NButton
              type="primary"
              :loading="imageLoading"
              @click="pickImageForCompress"
            >
              {{ page.t('actions.pickImage') }}
            </NButton>
          </div>

          <template v-if="pickedImage">
            <NGrid
              cols="1 768:2"
              :x-gap="16"
              :y-gap="16"
              style="margin-top: 16px"
            >
              <NGridItem>
                <NCard
                  class="editor-card"
                  :bordered="false"
                >
                  <template #header>
                    <span class="card-title">{{ page.t('labels.original') }}</span>
                  </template>
                  <div class="image-preview-wrap">
                    <img
                      :src="compressOriginalPreviewUri"
                      :alt="page.t('labels.original')"
                      class="image-preview"
                    >
                  </div>
                  <div
                    class="image-meta"
                    style="margin-top: 8px"
                  >
                    <span>{{ page.t('labels.fileSize') }}: {{ formatBytes(pickedImage.size) }}</span>
                  </div>
                </NCard>
              </NGridItem>
              <NGridItem>
                <NCard
                  v-if="compressResult"
                  class="editor-card"
                  :bordered="false"
                >
                  <template #header>
                    <span class="card-title">{{ page.t('labels.result') }}</span>
                  </template>
                  <div class="image-preview-wrap">
                    <img
                      :src="`data:${compressResult.mimeType};base64,${compressResult.data}`"
                      :alt="page.t('labels.result')"
                      class="image-preview"
                    >
                  </div>
                  <div
                    class="image-meta"
                    style="margin-top: 8px"
                  >
                    <span>{{ page.t('labels.sizeAfter') }}: {{ formatBytes(compressResult.size) }}</span>
                    <NTag
                      type="success"
                      size="small"
                      :bordered="false"
                    >
                      {{ page.t('labels.compressionRatio') }}: {{ compressRatio }}
                    </NTag>
                  </div>
                </NCard>
                <NCard
                  v-else
                  class="editor-card"
                  :bordered="false"
                >
                  <div class="result-placeholder">
                    {{ page.t('labels.result') }}
                  </div>
                </NCard>
              </NGridItem>
            </NGrid>

            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.outputFormat') }}</span>
              </template>
              <div class="compress-options">
                <div class="option-row">
                  <span class="section-label">{{ page.t('labels.outputFormat') }}</span>
                  <NSelect
                    v-model:value="compressFormat"
                    :options="compressFormatOptions"
                    style="width: 160px"
                  />
                </div>
                <div
                  v-if="compressFormat !== 'png'"
                  class="option-row"
                >
                  <span class="section-label">{{ page.t('labels.quality') }}: {{ compressQuality }}</span>
                  <NSlider
                    v-model:value="compressQuality"
                    :min="1"
                    :max="100"
                    :step="1"
                    style="width: 260px"
                  />
                </div>
                <div
                  v-if="compressFormat === 'png'"
                  class="option-row"
                >
                  <span class="section-label">{{ page.t('labels.palette') }}</span>
                  <NRadioGroup
                    v-model:value="compressPalette"
                    size="small"
                  >
                    <NRadioButton :value="false">
                      {{ page.t('labels.no') }}
                    </NRadioButton>
                    <NRadioButton :value="true">
                      {{ page.t('labels.yes') }}
                    </NRadioButton>
                  </NRadioGroup>
                </div>
              </div>
            </NCard>

            <div class="action-bar">
              <NButton
                type="primary"
                :loading="compressLoading"
                @click="handleCompress"
              >
                {{ page.t('actions.compress') }}
              </NButton>
              <NButton
                v-if="compressResult"
                @click="saveCompressed"
              >
                {{ page.t('actions.save') }}
              </NButton>
            </div>
          </template>
        </NTabPane>

        <!-- ─── Resize Tab ──────────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('resize')"
          name="resize"
          :tab="page.t('tabs.resize')"
        >
          <div class="action-bar">
            <NButton
              type="primary"
              :loading="imageLoading"
              @click="pickImageForResize"
            >
              {{ page.t('actions.pickImage') }}
            </NButton>
          </div>

          <template v-if="pickedImage">
            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <div class="card-header-flex">
                  <span class="card-title">{{ page.t('labels.original') }}</span>
                  <NTag
                    v-if="infoData"
                    size="small"
                    :bordered="false"
                  >
                    {{ infoData.width }}×{{ infoData.height }}
                  </NTag>
                </div>
              </template>
              <div class="image-preview-wrap">
                <img
                  :src="resizeOriginalPreviewUri"
                  :alt="page.t('labels.original')"
                  class="image-preview"
                >
              </div>
            </NCard>

            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.resizeMode') }}</span>
              </template>
              <div class="resize-options">
                <div class="option-row">
                  <NRadioGroup
                    v-model:value="resizeMode"
                    size="small"
                  >
                    <NRadioButton value="preset">
                      {{ page.t('labels.presetSizes') }}
                    </NRadioButton>
                    <NRadioButton value="custom">
                      {{ page.t('labels.customSize') }}
                    </NRadioButton>
                  </NRadioGroup>
                </div>

                <div
                  v-if="resizeMode === 'preset'"
                  class="option-row"
                >
                  <span class="section-label">{{ page.t('labels.presetSizes') }}</span>
                  <NSelect
                    v-model:value="resizePreset"
                    :options="presetSizeOptions"
                    style="min-width: 220px"
                  />
                </div>

                <div
                  v-if="resizeMode === 'custom'"
                  class="custom-size-row"
                >
                  <div class="custom-size-field">
                    <span class="section-label">{{ page.t('labels.width') }}</span>
                    <NInput
                      :value="resizeCustomWidth != null ? String(resizeCustomWidth) : ''"
                      :placeholder="page.t('placeholders.width')"
                      style="width: 120px"
                      @update:value="handleResizeWidthInput"
                    />
                  </div>
                  <div class="lock-toggle">
                    <NButton
                      size="small"
                      :type="resizeLockAspect ? 'primary' : 'default'"
                      quaternary
                      @click="resizeLockAspect = !resizeLockAspect"
                    >
                      {{ resizeLockAspect ? '🔗' : '🔗' }}
                    </NButton>
                  </div>
                  <div class="custom-size-field">
                    <span class="section-label">{{ page.t('labels.height') }}</span>
                    <NInput
                      :value="resizeCustomHeight != null ? String(resizeCustomHeight) : ''"
                      :placeholder="page.t('placeholders.height')"
                      style="width: 120px"
                      @update:value="handleResizeHeightInput"
                    />
                  </div>
                </div>

                <div class="option-row">
                  <span class="section-label">{{ page.t('labels.fit') }}</span>
                  <NSelect
                    v-model:value="resizeFit"
                    :options="fitOptions"
                    style="width: 160px"
                  />
                </div>

                <div class="option-row">
                  <span class="section-label">{{ page.t('labels.withoutEnlargement') }}</span>
                  <NRadioGroup
                    v-model:value="resizeWithoutEnlargement"
                    size="small"
                  >
                    <NRadioButton :value="false">
                      {{ page.t('labels.no') }}
                    </NRadioButton>
                    <NRadioButton :value="true">
                      {{ page.t('labels.yes') }}
                    </NRadioButton>
                  </NRadioGroup>
                </div>
              </div>
            </NCard>

            <NCard
              v-if="resizeResult"
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <div class="card-header-flex">
                  <span class="card-title">{{ page.t('labels.result') }}</span>
                  <NTag
                    size="small"
                    :bordered="false"
                  >
                    {{ resizeResult.width }}×{{ resizeResult.height }}
                  </NTag>
                </div>
              </template>
              <div class="image-preview-wrap">
                <img
                  :src="`data:${resizeResult.mimeType};base64,${resizeResult.data}`"
                  :alt="page.t('labels.result')"
                  class="image-preview"
                >
              </div>
            </NCard>

            <div class="action-bar">
              <NButton
                type="primary"
                :loading="resizeLoading"
                @click="handleResize"
              >
                {{ page.t('actions.resize') }}
              </NButton>
              <NButton
                v-if="resizeResult"
                @click="saveResized"
              >
                {{ page.t('actions.save') }}
              </NButton>
            </div>
          </template>
        </NTabPane>

        <!-- ─── Convert Tab ──────────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('convert')"
          name="convert"
          :tab="page.t('tabs.convert')"
        >
          <div class="action-bar">
            <NButton
              type="primary"
              :loading="imageLoading"
              @click="pickImageForConvert"
            >
              {{ page.t('actions.pickImage') }}
            </NButton>
          </div>

          <template v-if="pickedImage">
            <NGrid
              cols="1 768:2"
              :x-gap="16"
              :y-gap="16"
              style="margin-top: 16px"
            >
              <NGridItem>
                <NCard
                  class="editor-card"
                  :bordered="false"
                >
                  <template #header>
                    <div class="card-header-flex">
                      <span class="card-title">{{ page.t('labels.original') }}</span>
                      <NTag
                        size="small"
                        :bordered="false"
                      >
                        {{ pickedImage.mimeType }}
                      </NTag>
                    </div>
                  </template>
                  <div class="image-preview-wrap">
                    <img
                      :src="convertOriginalPreviewUri"
                      :alt="page.t('labels.original')"
                      class="image-preview"
                    >
                  </div>
                </NCard>
              </NGridItem>
              <NGridItem>
                <NCard
                  v-if="convertResult"
                  class="editor-card"
                  :bordered="false"
                >
                  <template #header>
                    <div class="card-header-flex">
                      <span class="card-title">{{ page.t('labels.result') }}</span>
                      <NTag
                        size="small"
                        :bordered="false"
                      >
                        {{ convertResult.mimeType }}
                      </NTag>
                    </div>
                  </template>
                  <div class="image-preview-wrap">
                    <img
                      :src="`data:${convertResult.mimeType};base64,${convertResult.data}`"
                      :alt="page.t('labels.result')"
                      class="image-preview"
                    >
                  </div>
                </NCard>
                <NCard
                  v-else
                  class="editor-card"
                  :bordered="false"
                >
                  <div class="result-placeholder">
                    {{ page.t('labels.result') }}
                  </div>
                </NCard>
              </NGridItem>
            </NGrid>

            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.targetFormat') }}</span>
              </template>
              <div class="convert-options">
                <div class="option-row">
                  <span class="section-label">{{ page.t('labels.targetFormat') }}</span>
                  <NSelect
                    v-model:value="convertTargetFormat"
                    :options="convertFormatOptions"
                    style="width: 160px"
                  />
                </div>
                <div
                  v-if="convertTargetFormat !== 'png'"
                  class="option-row"
                >
                  <span class="section-label">{{ page.t('labels.quality') }}: {{ convertQuality }}</span>
                  <NSlider
                    v-model:value="convertQuality"
                    :min="1"
                    :max="100"
                    :step="1"
                    style="width: 260px"
                  />
                </div>
                <div
                  v-if="convertTargetFormat === 'jpeg' && sourceHasAlpha"
                  class="option-row"
                >
                  <span class="section-label">{{ page.t('labels.background') }}</span>
                  <NInput
                    v-model:value="convertBackground"
                    :placeholder="page.t('placeholders.backgroundColor')"
                    style="width: 160px"
                  />
                  <span
                    class="color-swatch"
                    :style="{ backgroundColor: convertBackground }"
                  />
                </div>
              </div>
            </NCard>

            <div class="action-bar">
              <NButton
                type="primary"
                :loading="convertLoading"
                @click="handleConvert"
              >
                {{ page.t('actions.convert') }}
              </NButton>
              <NButton
                v-if="convertResult"
                @click="saveConverted"
              >
                {{ page.t('actions.save') }}
              </NButton>
            </div>
          </template>
        </NTabPane>

        <!-- ─── Data URL Tab ────────────────────────────────────────────── -->
        <ImageDataUrlPanel v-if="showTab('dataUrl')" />
        <ImageSvgPanel v-if="showTab('svg')" />
        <NTabPane
          v-if="showTab('color')"
          name="color"
          :tab="page.t('tabs.color')"
        >
          <div
            class="action-bar"
            style="margin-top: 0; border-top: none; padding-top: 0"
          >
            <NButton
              type="primary"
              :loading="imageLoading"
              @click="pickImageForColor"
            >
              {{ page.t('actions.pickImage') }}
            </NButton>
            <NButton @click="loadFromClipboard">
              {{ page.t('labels.clipboardImage') }}
            </NButton>
          </div>

          <template v-if="pickedImage">
            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.clickToPick') }}</span>
              </template>
              <div class="image-preview-wrap color-picker-preview">
                <img
                  :src="pickedImage.dataUri"
                  :alt="page.t('labels.preview')"
                  class="image-preview"
                  crossorigin="anonymous"
                  style="cursor: crosshair"
                  @click="handleImageClick"
                >
              </div>
            </NCard>

            <NCard
              v-if="colorPickedHex"
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.pickedColor') }}</span>
              </template>
              <div class="picked-color-row">
                <span
                  class="color-swatch-large"
                  :style="{ backgroundColor: colorPickedHex }"
                />
                <div class="color-values">
                  <div class="color-value-row">
                    <span class="result-label">HEX</span>
                    <code class="color-code">{{ colorPickedHex }}</code>
                    <NButton
                      size="tiny"
                      quaternary
                      @click="copy(colorPickedHex, page.t('messages.imageCopied'))"
                    >
                      {{ page.t('actions.copyValue') }}
                    </NButton>
                  </div>
                  <div
                    v-if="colorPickedRgb"
                    class="color-value-row"
                  >
                    <span class="result-label">RGB</span>
                    <code class="color-code">rgb({{ colorPickedRgb.r }}, {{ colorPickedRgb.g }}, {{ colorPickedRgb.b }})</code>
                    <NButton
                      size="tiny"
                      quaternary
                      @click="copy(`rgb(${colorPickedRgb!.r}, ${colorPickedRgb!.g}, ${colorPickedRgb!.b})`, page.t('messages.imageCopied'))"
                    >
                      {{ page.t('actions.copyValue') }}
                    </NButton>
                  </div>
                  <div
                    v-if="colorPickedHsl"
                    class="color-value-row"
                  >
                    <span class="result-label">HSL</span>
                    <code class="color-code">hsl({{ colorPickedHsl.h }}, {{ colorPickedHsl.s }}%, {{ colorPickedHsl.l }}%)</code>
                    <NButton
                      size="tiny"
                      quaternary
                      @click="copy(`hsl(${colorPickedHsl!.h}, ${colorPickedHsl!.s}%, ${colorPickedHsl.l}%)`, page.t('messages.imageCopied'))"
                    >
                      {{ page.t('actions.copyValue') }}
                    </NButton>
                  </div>
                </div>
              </div>
            </NCard>

            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <div class="card-header-flex">
                  <span class="card-title">{{ page.t('labels.dominantColors') }}</span>
                  <NButton
                    size="small"
                    :loading="colorExtracting"
                    @click="handleExtractColors"
                  >
                    {{ page.t('actions.extractColors') }}
                  </NButton>
                </div>
              </template>
              <div
                v-if="colorExtractedColors.length"
                class="color-palette"
              >
                <div
                  v-for="(c, i) in colorExtractedColors"
                  :key="i"
                  class="color-palette-item"
                >
                  <span
                    class="color-swatch"
                    :style="{ backgroundColor: c.hex }"
                  />
                  <span class="color-palette-info">
                    <code class="color-code">{{ c.hex }}</code>
                    <span class="color-ratio">{{ c.ratio }}%</span>
                  </span>
                  <NButton
                    size="tiny"
                    quaternary
                    @click="copy(c.hex, page.t('messages.imageCopied'))"
                  >
                    {{ page.t('actions.copyValue') }}
                  </NButton>
                </div>
              </div>
              <div
                v-else
                class="result-placeholder"
              >
                {{ page.t('labels.noColorsExtracted') }}
              </div>
            </NCard>

            <div class="action-bar">
              <NButton @click="goToColorConverter">
                {{ page.t('actions.goToColorConverter') }}
              </NButton>
            </div>
          </template>
        </NTabPane>

        <!-- ─── Favicon Tab ──────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('favicon')"
          name="favicon"
          :tab="page.t('tabs.favicon')"
        >
          <div
            class="action-bar"
            style="margin-top: 0; border-top: none; padding-top: 0"
          >
            <NButton
              type="primary"
              :loading="imageLoading"
              @click="pickImageForFavicon"
            >
              {{ page.t('actions.pickImage') }}
            </NButton>
          </div>

          <template v-if="pickedImage">
            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.iconPreset') }}</span>
              </template>
              <div class="favicon-options">
                <div class="option-row">
                  <span class="section-label">{{ page.t('labels.iconPreset') }}</span>
                  <NSelect
                    v-model:value="faviconPreset"
                    :options="faviconPresetOptions"
                    style="min-width: 200px"
                  />
                </div>
                <div class="option-row">
                  <span class="section-label">{{ page.t('labels.includeIco') }}</span>
                  <NSwitch v-model:value="faviconIncludeIco" />
                </div>
              </div>
            </NCard>

            <div class="action-bar">
              <NButton
                type="primary"
                :loading="faviconLoading"
                @click="handleGenerateIcons"
              >
                {{ page.t('actions.generateIcons') }}
              </NButton>
            </div>

            <template v-if="faviconResult">
              <NCard
                class="editor-card"
                :bordered="false"
                style="margin-top: 16px"
              >
                <template #header>
                  <span class="card-title">{{ page.t('labels.generatedIcons') }} ({{ faviconResult.icons.length }})</span>
                </template>
                <div class="icon-grid">
                  <div
                    v-for="(icon, i) in faviconResult.icons"
                    :key="i"
                    class="icon-item"
                  >
                    <img
                      :src="`data:image/png;base64,${icon.data}`"
                      :alt="icon.fileName"
                      class="icon-preview"
                    >
                    <span class="icon-label">{{ icon.width }}×{{ icon.height }}</span>
                    <span class="icon-filename">{{ icon.fileName }}</span>
                  </div>
                </div>

                <div
                  v-if="faviconResult.ico"
                  style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border)"
                >
                  <div class="info-item">
                    <span class="result-label">{{ page.t('labels.icoFile') }}</span>
                    <NTag
                      size="small"
                      :bordered="false"
                    >
                      {{ faviconResult.ico.fileName }}
                    </NTag>
                    <span class="info-value">{{ formatBytes(faviconResult.ico.size) }}</span>
                  </div>
                </div>
              </NCard>

              <div class="action-bar">
                <NButton @click="saveFaviconIcons">
                  {{ page.t('actions.saveAll') }}
                </NButton>
              </div>
            </template>
          </template>
        </NTabPane>

        <!-- ─── Batch Tab ──────────────────────────────────────────── -->
        <ImageBatchPanel v-if="showTab('batch')" />
        <!-- ─── Compare Tab ──────────────────────────────────────────── -->
        <ImageComparePanel v-if="showTab('compare')" />
        <!-- ─── Preset Tab ──────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('preset')"
          name="preset"
          :tab="page.t('tabs.preset')"
        >
          <div
            class="action-bar"
            style="margin-top: 0; border-top: none; padding-top: 0"
          >
            <NButton
              type="primary"
              :loading="imageLoading"
              @click="pickImageForPreset"
            >
              {{ page.t('actions.pickImage') }}
            </NButton>
          </div>

          <template v-if="pickedImage">
            <NCard
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <span class="card-title">{{ page.t('labels.encodePreset') }}</span>
              </template>
              <p class="preset-description">
                {{ page.t('labels.presetDescription') }}
              </p>
              <div class="preset-grid">
                <div
                  v-for="preset in ENCODE_PRESETS"
                  :key="preset.key"
                  class="preset-card"
                  :class="{ 'preset-card--loading': presetLoading }"
                  @click="applyPreset(preset)"
                >
                  <span class="preset-name">{{ page.t(`labels.${preset.key}` as any) }}</span>
                  <span class="preset-desc">{{ page.t(`labels.${preset.key}Desc` as any) }}</span>
                </div>
              </div>
            </NCard>

            <NCard
              v-if="presetResult"
              class="editor-card"
              :bordered="false"
              style="margin-top: 16px"
            >
              <template #header>
                <div class="card-header-flex">
                  <span class="card-title">{{ page.t('labels.result') }}</span>
                  <NTag
                    size="small"
                    :bordered="false"
                  >
                    {{ presetResult.mimeType }}
                  </NTag>
                </div>
              </template>
              <div class="image-preview-wrap">
                <img
                  :src="`data:${presetResult.mimeType};base64,${presetResult.data}`"
                  :alt="page.t('labels.result')"
                  class="image-preview"
                >
              </div>
              <div
                class="image-meta"
                style="margin-top: 8px"
              >
                <span>{{ presetResult.width }}×{{ presetResult.height }}</span>
                <span>{{ formatBytes(presetResult.size) }}</span>
              </div>
              <div
                class="action-bar"
                style="margin-top: 12px; border-top: none; padding-top: 0"
              >
                <NButton @click="savePresetResult">
                  {{ page.t('actions.save') }}
                </NButton>
              </div>
            </NCard>
          </template>
        </NTabPane>
      </NTabs>
    </div>
  </PageLayout>
</template>

<style scoped>
.drop-zone {
  position: relative;
}

.drop-zone--active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(24, 160, 88, 0.08);
  border: 2px dashed var(--color-primary);
  border-radius: 12px;
  z-index: 100;
  pointer-events: none;
}

.category-tabs {
  margin-bottom: var(--space-4);
}

.converter-tabs {
  margin-top: var(--space-2);
}

.editor-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
}

.editor-card :deep(.n-card-header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.editor-card :deep(.n-card__content) {
  padding: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-header-flex {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-input {
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.code-input :deep(.n-input__textarea-el) {
  font-family: var(--font-family-mono);
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.result-box {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.result-label {
  color: var(--color-text-secondary);
  margin-right: 8px;
}

.result-placeholder {
  padding: 16px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.section-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 100px;
}

/* ─── Base64 Tab ─────────────────────────────── */
.image-base64-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.image-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.image-base64-output {
  margin-top: 8px;
}

.decode-mime-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.image-preview-wrap {
  margin-top: 16px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  text-align: center;
}

.image-preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.preview-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ─── Info Tab ─────────────────────────────── */
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.info-value {
  color: var(--color-text-primary);
  font-size: 14px;
  word-break: break-all;
}

.info-path {
  font-family: var(--font-family-mono);
  font-size: 13px;
}

.exif-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exif-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.exif-key {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.exif-val {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  word-break: break-all;
}

/* ─── Compress / Resize / Convert Options ──── */
.compress-options,
.resize-options,
.convert-options,
.favicon-options,
.batch-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-size-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-size-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lock-toggle {
  display: flex;
  align-items: center;
}

.svg-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.svg-option-label {
  font-size: 13px;
  color: var(--color-text-primary);
}

.color-swatch {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ─── Color Picker ─────────────────────────────── */
.picked-color-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.color-swatch-large {
  display: inline-block;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-code {
  font-family: var(--font-family-mono);
  font-size: 13px;
  color: var(--color-text-primary);
}

.color-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.color-palette-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-ratio {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.color-picker-preview {
  cursor: crosshair;
}

/* ─── Favicon ─────────────────────────────── */
.favicon-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  min-width: 80px;
}

.icon-preview {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
}

.icon-label {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.icon-filename {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-family: var(--font-family-mono);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Batch ─────────────────────────────── */
.batch-image-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.batch-image-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.batch-image-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-image-size {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.batch-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.batch-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.batch-result-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-result-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.batch-result-error {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ─── Compare ─────────────────────────────── */
.compare-side-by-side {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.compare-image-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.compare-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.compare-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
}

.compare-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.compare-slider-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  cursor: ew-resize;
  user-select: none;
}

.compare-slider-img {
  display: block;
  width: 100%;
  height: auto;
}

.compare-slider-clip {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  overflow: hidden;
}

.compare-slider-clip .compare-slider-img {
  width: auto;
  min-width: 100%;
  max-width: none;
}

.compare-slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
}

.compare-slider-handle::before,
.compare-slider-handle::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.compare-slider-handle::before {
  top: 50%;
  margin-top: -12px;
}

.compare-slider-labels {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 12px;
  pointer-events: none;
}

.compare-label-a,
.compare-label-b {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 8px;
  border-radius: 4px;
}

.compare-diff-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.compare-diff-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.diff-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-legend-color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
}

/* ─── Preset ─────────────────────────────── */
.preset-description {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.preset-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.preset-card--loading {
  opacity: 0.6;
  pointer-events: none;
}

.preset-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.preset-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.image-preview-wrap {
  display: flex;
  justify-content: center;
}

.image-preview-wrap .image-preview {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

.image-meta {
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
