import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: 'linear-gradient(135deg, #4c1d95 0%, #be185d 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: '#f9a8d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: '#ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fce7f3',
              }}
            />
          </div>
        </div>
        <div style={{ color: 'white', fontSize: 72, fontWeight: 900, letterSpacing: 4 }}>
          GANESHA
        </div>
        <div style={{ color: '#f9a8d4', fontSize: 36 }}>esthetic</div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
