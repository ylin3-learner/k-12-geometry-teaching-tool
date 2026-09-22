import { ImageLayer } from './ImageLayer';
import { useSceneStore } from '../../store/useSceneStore';

/**
 * 主畫布：一個 SVG 元素。
 *
 * - viewBox 對應圖片的自然尺寸（若無圖片則用預設 800×600）
 * - preserveAspectRatio="xMidYMid meet" 讓圖片按比例縮放並置中
 * - ImageLayer 在底層（背景）
 * - 之後的 VertexLayer、ShapeLayer 會疊在上面
 */
export function Canvas() {
  const image = useSceneStore((s) => s.image);

  const width = image?.naturalWidth ?? 800;
  const height = image?.naturalHeight ?? 600;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: '100%',
        background: '#fafafa',
        display: 'block',
      }}
    >
      <ImageLayer />
    </svg>
  );
}