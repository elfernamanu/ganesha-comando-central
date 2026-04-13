import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#4c1d95',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'white', fontSize: 80, fontWeight: 900, letterSpacing: 6 }}>
          GANESHA
        </div>
        <div style={{ color: '#d8b4fe', fontSize: 36, marginTop: 8 }}>
          esthetic
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
