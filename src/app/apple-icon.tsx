import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div style={{ fontSize: 85, lineHeight: 1 }}>🪷</div>
        <div style={{ fontSize: 20, color: 'white', fontWeight: 800 }}>Ganesha</div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
