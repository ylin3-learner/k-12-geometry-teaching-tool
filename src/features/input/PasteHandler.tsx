import { useEffect } from 'react';
import { useSceneStore } from '../../store/useSceneStore';

/**
 * 監聽全頁 Ctrl+V（或 Cmd+V），把剪貼簿裡的圖片載入場景。
 *
 * 用 FileReader.readAsDataURL 而非 URL.createObjectURL：
 * blob URL 需要管理生命週期（撤銷時機），data URL 自包含，不會有
 * 「撤銷後才被 fetch」的競態問題。
 */
export function PasteHandler() {
  const setImage = useSceneStore((s) => s.setImage);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => setImage(img);
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);

          e.preventDefault();
          return;
        }
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [setImage]);

  return null;
}