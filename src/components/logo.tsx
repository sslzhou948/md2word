/**
 * md2word Logo 组件
 * 
 * 使用 SVG 内嵌，无需外部图片文件
 * 如需替换，修改此组件的 SVG 路径即可
 */

type LogoProps = {
  className?: string;
  size?: number;
};

export function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 背景圆角矩形 */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="12"
        fill="#000000"
      />
      {/* 文档图标 - 简化版 */}
      <path
        d="M 20 18 L 20 46 L 44 46 L 44 28 L 36 28 L 36 18 Z"
        fill="#FFFFFF"
      />
      {/* 文档折角 */}
      <path
        d="M 36 18 L 36 28 L 44 28 Z"
        fill="#E5E5E5"
      />
      {/* 文档线条（表示文本） */}
      <line
        x1="24"
        y1="32"
        x2="40"
        y2="32"
        stroke="#000000"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="36"
        x2="38"
        y2="36"
        stroke="#000000"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="40"
        x2="36"
        y2="40"
        stroke="#000000"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 转换箭头 */}
      <path
        d="M 46 20 L 52 26 L 46 32"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="52"
        y1="26"
        x2="58"
        y2="26"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Word 图标 - 简化版 W */}
      <path
        d="M 50 38 L 52 42 L 54 38 L 56 42 L 58 38"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

