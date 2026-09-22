import type { HTMLAttributes } from 'react';
import { useSceneStore } from '../../store/useSceneStore';

type Props = HTMLAttributes<SVGImageElement>;

/**
 * 把場景裡的 image 當作 SVG <image> 背景渲染。
 *
 * viewBox 對應圖片的自然尺寸，讓頂點座標系（image space）
 * 與 SVG 內部座標系一致——這樣之後頂點的 position 可以直接餵給 SVG。
 */
export function ImageLayer(props: Props) {
  const image = useSceneStore((s) => s.image);

  if (!image) return null;

  return (
    <image
      href={image.src}
      x={0}
      y={0}
      width={image.naturalWidth}
      height={image.naturalHeight}
      {...props}
    />
  );
}