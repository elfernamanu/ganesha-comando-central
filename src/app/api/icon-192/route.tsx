import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: 'linear-gradient(135deg, #4c1d95 0%, #be185d 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#f9a8d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ec4899',
            }}
          />
        </div>
        <div style={{ color: 'white', fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>
          GANESHA
        </div>
        <div style={{ color: '#f9a8d4', fontSize: 11 }}>esthetic</div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
