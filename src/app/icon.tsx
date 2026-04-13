import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
          borderRadius: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div style={{ fontSize: 90, lineHeight: 1 }}>🪷</div>
        <div style={{ fontSize: 22, color: 'white', fontWeight: 800, letterSpacing: -1 }}>
          Ganesha
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
