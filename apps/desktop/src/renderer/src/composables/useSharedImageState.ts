import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useToolI18n } from './useToolI18n'
import { useIpc } from './useIpc'
import type { ProcessedImage, ImageInfo } from '@dev-tool-kit/shared'

export interface PickedImage {
  fileName: string
  filePath: string
  mimeType: string
  base64: string
  dataUri: string
  size: number
}

/**
 * ImageToolsView 与其面板共享的图片状态（模块级单例）。
 *
 * pickedImage / infoData 由拖拽、粘贴、pickImage、fetchInfo 统一更新，
 * 所有面板通过本 composable 读取；面板组件各自调用 useMessage /
 * useToolI18n / useIpc，仅共享这里的 ref 与通用操作。
 */
const pickedImage = ref<PickedImage | null>(null)
const infoData = ref<ImageInfo | null>(null)
const imageLoading = ref(false)

export function useSharedImageState() {
  const message = useMessage()
  const page = useToolI18n('imageTools')
  const { invoke } = useIpc()

  async function pickImage(): Promise<PickedImage | null> {
    imageLoading.value = true
    try {
      const data = await invoke<PickedImage | null>('image-tools:pickImage')
      if (!data) return null
      pickedImage.value = data
      message.success(page.t('messages.imageLoaded'))
      return data
    } catch {
      message.error(page.t('messages.imageLoadFailed'))
      return null
    } finally {
      imageLoading.value = false
    }
  }

  async function fetchInfo(filePath: string): Promise<ImageInfo | null> {
    try {
      const info = await invoke<ImageInfo | null>('image-tools:getInfo', filePath)
      infoData.value = info ?? null
      return infoData.value
    } catch {
      infoData.value = null
      return null
    }
  }

  async function saveProcessedImage(img: ProcessedImage): Promise<void> {
    try {
      const result = await invoke<{ success: boolean; path?: string }>(
        'image-tools:saveImage',
        img.data,
        img.fileName,
        img.mimeType
      )
      if (result?.success) {
        message.success(page.t('messages.saveSuccess'))
      } else {
        message.error(page.t('messages.saveFailed'))
      }
    } catch {
      message.error(page.t('messages.saveFailed'))
    }
  }

  return { pickedImage, infoData, imageLoading, pickImage, fetchInfo, saveProcessedImage }
}
