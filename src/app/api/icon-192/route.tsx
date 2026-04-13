import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: '#4c1d95',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
          GANESHA
        </div>
        <div style={{ color: '#d8b4fe', fontSize: 13, marginTop: 4 }}>
          esthetic
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
