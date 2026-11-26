import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

// Background scenery for each chapter of the route map, drawn as vector
// shapes so it stays sharp on any screen and needs no image files.
//
// Every scene is drawn on a 400 x 960 canvas (the shape of a chapter
// page) and scaled to cover the page. Colours are kept soft so the level
// circles on top stay easy to read.

const W = 400;
const H = 960;

// ---------- small reusable pieces ----------

// Same "random" positions every time for a given seed.
const scatter = (seed: number, count: number, yMin = 0, yMax = H) => {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return [...Array(count)].map(() => ({
    x: next() * W,
    y: yMin + next() * (yMax - yMin),
    r: next(),
  }));
};

const Sky = ({ id, stops }: { id: string; stops: string[] }) => (
  <>
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map((color, i) => (
          <Stop key={i} offset={String(i / (stops.length - 1))} stopColor={color} />
        ))}
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width={W} height={H} fill={`url(#${id})`} />
  </>
);

// A wavy band from height y down to the bottom of the canvas.
const Hill = ({ y, amp = 40, color, flip = false }: { y: number; amp?: number; color: string; flip?: boolean }) => {
  const a = flip ? -amp : amp;
  return (
    <Path
      d={`M0 ${y} Q 100 ${y - a} 200 ${y} T 400 ${y} L400 ${H} L0 ${H} Z`}
      fill={color}
    />
  );
};

const Cloud = ({ x, y, s = 1, color = '#ffffff', opacity = 0.85 }: { x: number; y: number; s?: number; color?: string; opacity?: number }) => (
  <G opacity={opacity}>
    <Ellipse cx={x} cy={y} rx={34 * s} ry={14 * s} fill={color} />
    <Ellipse cx={x - 18 * s} cy={y - 6 * s} rx={18 * s} ry={14 * s} fill={color} />
    <Ellipse cx={x + 10 * s} cy={y - 12 * s} rx={20 * s} ry={16 * s} fill={color} />
  </G>
);

const RoundTree = ({ x, y, s = 1, leaf, trunk = '#a77f63' }: { x: number; y: number; s?: number; leaf: string; trunk?: string }) => (
  <G>
    <Rect x={x - 4 * s} y={y - 8 * s} width={8 * s} height={26 * s} rx={3 * s} fill={trunk} />
    <Circle cx={x} cy={y - 22 * s} r={22 * s} fill={leaf} />
    <Circle cx={x - 8 * s} cy={y - 28 * s} r={8 * s} fill="#ffffff" opacity={0.18} />
  </G>
);

const Pine = ({ x, y, s = 1, color, snow = false }: { x: number; y: number; s?: number; color: string; snow?: boolean }) => (
  <G>
    <Rect x={x - 3 * s} y={y} width={6 * s} height={12 * s} fill="#9b7a5f" />
    {[0, 1, 2].map((i) => {
      const top = y - (56 - i * 16) * s;
      const half = (14 + i * 7) * s;
      const base = top + 26 * s;
      return (
        <G key={i}>
          <Polygon points={`${x},${top} ${x - half},${base} ${x + half},${base}`} fill={color} />
          {snow && (
            <Polygon
              points={`${x},${top} ${x - half * 0.45},${top + 12 * s} ${x + half * 0.45},${top + 12 * s}`}
              fill="#ffffff"
            />
          )}
        </G>
      );
    })}
  </G>
);

const Flower = ({ x, y, color }: { x: number; y: number; color: string }) => (
  <G>
    {[0, 72, 144, 216, 288].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return <Circle key={deg} cx={x + Math.cos(rad) * 5} cy={y + Math.sin(rad) * 5} r={4} fill={color} />;
    })}
    <Circle cx={x} cy={y} r={3} fill="#f7d774" />
  </G>
);

const Bird = ({ x, y, s = 1, color = '#8a6f7a' }: { x: number; y: number; s?: number; color?: string }) => (
  <Path
    d={`M${x - 10 * s} ${y} Q ${x - 5 * s} ${y - 6 * s} ${x} ${y} Q ${x + 5 * s} ${y - 6 * s} ${x + 10 * s} ${y}`}
    stroke={color}
    strokeWidth={2}
    fill="none"
    strokeLinecap="round"
  />
);

const Sparkle = ({ x, y, r, color = '#ffffff' }: { x: number; y: number; r: number; color?: string }) => (
  <Path
    d={`M${x} ${y - r} L${x + r * 0.25} ${y - r * 0.25} L${x + r} ${y} L${x + r * 0.25} ${y + r * 0.25} L${x} ${y + r} L${x - r * 0.25} ${y + r * 0.25} L${x - r} ${y} L${x - r * 0.25} ${y - r * 0.25} Z`}
    fill={color}
  />
);

const Snowflake = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <G stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" opacity={0.9}>
    {[0, 60, 120].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const dx = Math.cos(rad) * r;
      const dy = Math.sin(rad) * r;
      return <Line key={deg} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} />;
    })}
  </G>
);

// A cog wheel outline as one path.
const gearPath = (cx: number, cy: number, r: number, teeth: number) => {
  const outer = r * 1.18;
  const points: string[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const angle = (i / (teeth * 4)) * Math.PI * 2;
    const radius = i % 4 === 1 || i % 4 === 2 ? outer : r;
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return `M${points.join(' L')} Z`;
};

const Gear = ({ x, y, r, teeth, color, hole }: { x: number; y: number; r: number; teeth: number; color: string; hole: string }) => (
  <G>
    <Path d={gearPath(x, y, r, teeth)} fill={color} />
    <Circle cx={x} cy={y} r={r * 0.62} fill={hole} opacity={0.55} />
    <Circle cx={x} cy={y} r={r * 0.22} fill={color} />
  </G>
);

// ---------- the ten scenes ----------

const Garden = () => (
  <>
    <Sky id="sky1" stops={['#e9f7f1', '#d2ece1']} />
    <Circle cx={320} cy={110} r={62} fill="#fff6d6" opacity={0.5} />
    <Circle cx={320} cy={110} r={40} fill="#fff0bf" />
    <Cloud x={90} y={90} />
    <Cloud x={250} y={210} s={0.8} />
    <Hill y={320} color="#c6e6d7" />
    {[[60, 300], [345, 315], [150, 330]].map(([x, y], i) => (
      <RoundTree key={i} x={x} y={y} s={0.9} leaf="#9fd2b8" />
    ))}
    <Hill y={580} color="#b2dcc8" flip />
    {[[40, 560], [365, 575], [250, 600]].map(([x, y], i) => (
      <RoundTree key={i} x={x} y={y} leaf="#86c5a5" />
    ))}
    <Hill y={830} color="#9ed1b9" />
    {[[70, 820], [330, 835]].map(([x, y], i) => (
      <RoundTree key={i} x={x} y={y} s={1.2} leaf="#74b996" />
    ))}
    {scatter(11, 26, 340, H).map((p, i) => (
      <Flower key={i} x={p.x} y={p.y} color={['#f4a6b8', '#f7c873', '#c9a6e8', '#ffffff'][i % 4]} />
    ))}
  </>
);

const ForestSteps = () => {
  const steps = [...Array(16).keys()].map((i) => ({
    x: 140 + Math.sin(i * 0.9) * 90,
    y: 120 + i * 52,
  }));
  return (
    <>
      <Sky id="sky2" stops={['#f0f7e6', '#d5e9c2']} />
      <Ellipse cx={120} cy={200} rx={160} ry={30} fill="#ffffff" opacity={0.45} />
      <Ellipse cx={300} cy={520} rx={170} ry={28} fill="#ffffff" opacity={0.4} />
      {steps.map((st, i) => (
        <Rect key={i} x={st.x} y={st.y} width={120} height={24} rx={6} fill="#d6dcc6" stroke="#c3cbb0" strokeWidth={2} />
      ))}
      {scatter(22, 22).map((p, i) => {
        const side = i % 2 === 0 ? 10 + p.r * 70 : 320 + p.r * 70;
        return <Pine key={i} x={side} y={p.y} s={0.8 + p.r * 0.6} color={i % 3 === 0 ? '#6fa64f' : '#8fbf6a'} />;
      })}
      <Hill y={900} amp={25} color="#b7d79c" />
    </>
  );
};

const Desert = () => (
  <>
    <Sky id="sky3" stops={['#fdf3e1', '#f8dfba']} />
    <Circle cx={95} cy={125} r={78} fill="#fbe2a8" opacity={0.45} />
    <Circle cx={95} cy={125} r={50} fill="#f9d48f" />
    <Bird x={260} y={110} />
    <Bird x={300} y={140} s={0.8} />
    <Hill y={340} amp={50} color="#f4d8ab" />
    <Polygon points="300,190 220,345 380,345" fill="#efcb93" />
    <Polygon points="300,190 300,345 380,345" fill="#e3b77a" />
    <Polygon points="215,265 175,345 255,345" fill="#efcb93" />
    <Polygon points="215,265 215,345 255,345" fill="#e3b77a" />
    <Hill y={610} amp={60} color="#efca98" flip />
    <Polygon points="95,470 20,615 170,615" fill="#e9be84" />
    <Polygon points="95,470 95,615 170,615" fill="#dcaa6a" />
    {[[330, 600], [60, 850], [300, 880]].map(([x, y], i) => (
      <G key={i} fill="#9cbf7f">
        <Rect x={x - 8} y={y - 60} width={16} height={60} rx={8} />
        <Rect x={x - 26} y={y - 42} width={10} height={24} rx={5} />
        <Rect x={x - 26} y={y - 24} width={20} height={9} rx={4} />
        <Rect x={x + 16} y={y - 50} width={10} height={26} rx={5} />
        <Rect x={x + 6} y={y - 30} width={20} height={9} rx={4} />
      </G>
    ))}
    <Hill y={870} amp={40} color="#e8bb80" />
  </>
);

const SunsetPalace = () => (
  <>
    <Sky id="sky4" stops={['#f0b3b4', '#f8c9a6', '#fde4c9']} />
    <Circle cx={200} cy={430} r={150} fill="#fcd9a0" opacity={0.45} />
    <Circle cx={200} cy={430} r={105} fill="#fbcf85" />
    {[[90, 120], [130, 150], [300, 200], [270, 230]].map(([x, y], i) => (
      <Bird key={i} x={x} y={y} color="#b9707a" />
    ))}
    <Cloud x={300} y={300} color="#fde4d7" opacity={0.7} />
    {/* palace silhouette */}
    <G fill="#e39a85">
      <Rect x={70} y={440} width={260} height={80} />
      <Ellipse cx={200} cy={440} rx={58} ry={52} />
      <Rect x={196} y={372} width={8} height={24} />
      <Ellipse cx={120} cy={440} rx={30} ry={28} />
      <Ellipse cx={280} cy={440} rx={30} ry={28} />
      <Rect x={40} y={360} width={18} height={160} />
      <Ellipse cx={49} cy={360} rx={13} ry={14} />
      <Rect x={342} y={360} width={18} height={160} />
      <Ellipse cx={351} cy={360} rx={13} ry={14} />
    </G>
    {[110, 160, 240, 290].map((x) => (
      <Path key={x} d={`M${x - 10} 520 L${x - 10} 485 Q ${x} 468 ${x + 10} 485 L${x + 10} 520 Z`} fill="#f5c3a5" />
    ))}
    {/* water and reflection */}
    <Rect x={0} y={520} width={W} height={H - 520} fill="#f6c6ab" />
    <Rect x={70} y={520} width={260} height={60} fill="#eeae95" opacity={0.6} />
    {[...Array(12).keys()].map((i) => (
      <Line key={i} x1={40 + (i % 3) * 110} y1={560 + i * 32} x2={110 + (i % 3) * 110} y2={560 + i * 32} stroke="#fde4d2" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
    ))}
    <G fill="#eaa992">
      {[0, 1, 2, 3, 4].map((i) => (
        <Path key={i} d={`M${20 + i * 76} 960 L${20 + i * 76} 880 Q ${58 + i * 76} 830 ${96 + i * 76} 880 L${96 + i * 76} 960 Z`} />
      ))}
    </G>
  </>
);

const OceanTower = () => (
  <>
    <Sky id="sky5" stops={['#e6f3fc', '#d2e7f6']} />
    <Cloud x={80} y={110} />
    <Cloud x={200} y={60} s={0.7} />
    <Bird x={150} y={200} color="#7d97b0" />
    <Bird x={185} y={225} s={0.8} color="#7d97b0" />
    {/* lighthouse */}
    <Polygon points="300,320 340,320 352,520 288,520" fill="#eef4f9" />
    {[350, 410, 470].map((y) => (
      <Polygon key={y} points={`${300 - (y - 320) * 0.06},${y} ${340 + (y - 320) * 0.06},${y} ${340 + (y + 26 - 320) * 0.06},${y + 26} ${300 - (y + 26 - 320) * 0.06},${y + 26}`} fill="#8fb5d9" />
    ))}
    <Rect x={296} y={290} width={48} height={30} rx={4} fill="#f7e3a3" />
    <Path d="M296 290 Q 320 262 344 290 Z" fill="#6f95bd" />
    <Polygon points="296,300 60,240 60,360" fill="#fff4c4" opacity={0.45} />
    <Rect x={270} y={510} width={100} height={30} rx={8} fill="#a9bccb" />
    {/* sea */}
    <Rect x={0} y={520} width={W} height={H - 520} fill="#bcd9ef" />
    {[...Array(13).keys()].map((i) => {
      const y = 545 + i * 32;
      const shift = (i % 2) * 40;
      return (
        <Path key={i} d={`M${-40 + shift} ${y} q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`} stroke="#e8f3fb" strokeWidth={3} fill="none" opacity={0.75} />
      );
    })}
    {[[95, 640], [250, 820]].map(([x, y], i) => (
      <G key={i}>
        <Path d={`M${x - 34} ${y} L${x + 34} ${y} L${x + 24} ${y + 16} L${x - 24} ${y + 16} Z`} fill="#9e8273" />
        <Polygon points={`${x},${y - 70} ${x},${y - 4} ${x + 34},${y - 4}`} fill="#fbfdff" />
        <Polygon points={`${x - 3},${y - 56} ${x - 3},${y - 4} ${x - 28},${y - 4}`} fill="#e5eef6" />
      </G>
    ))}
  </>
);

const FrozenLake = () => (
  <>
    <Sky id="sky6" stops={['#eef8fb', '#dcf0f6']} />
    <Polygon points="-20,360 90,130 200,360" fill="#c6dbe7" />
    <Polygon points="90,130 60,195 80,185 95,205 115,180 122,195" fill="#ffffff" />
    <Polygon points="120,360 250,90 390,360" fill="#b9d2e1" />
    <Polygon points="250,90 212,170 236,158 252,182 272,154 290,172" fill="#ffffff" />
    <Polygon points="290,360 380,200 460,360" fill="#cbdfea" />
    <Rect x={0} y={350} width={W} height={H - 350} fill="#f2fafc" />
    <Ellipse cx={200} cy={620} rx={240} ry={175} fill="#cfe9f2" />
    <Ellipse cx={200} cy={620} rx={200} ry={140} fill="#bfe1ee" />
    <G stroke="#ffffff" strokeWidth={2} opacity={0.85} fill="none">
      <Path d="M120 560 L170 600 L160 650 L210 690" />
      <Path d="M170 600 L230 585 L280 620" />
      <Path d="M250 700 L290 660 L320 680" />
    </G>
    {[[40, 400], [360, 420], [30, 830], [370, 860], [110, 890], [290, 900]].map(([x, y], i) => (
      <Pine key={i} x={x} y={y} s={0.9 + (i % 3) * 0.15} color="#7fa8a2" snow />
    ))}
    {scatter(66, 40).map((p, i) => (
      <Snowflake key={i} x={p.x} y={p.y} r={3 + p.r * 5} />
    ))}
  </>
);

const ClockworkSpire = () => (
  <>
    <Sky id="sky7" stops={['#f4eee3', '#e6dbc7']} />
    {/* spire and clock */}
    <Polygon points="200,20 172,170 228,170" fill="#d9c7a4" />
    <Rect x={160} y={170} width={80} height={200} fill="#e2d2b3" />
    <Circle cx={200} cy={240} r={34} fill="#f8f2e6" stroke="#b89a6b" strokeWidth={5} />
    <Line x1={200} y1={240} x2={200} y2={218} stroke="#8a6a3b" strokeWidth={4} strokeLinecap="round" />
    <Line x1={200} y1={240} x2={216} y2={248} stroke="#8a6a3b" strokeWidth={3} strokeLinecap="round" />
    <Rect x={140} y={360} width={120} height={20} fill="#d3bf98" />
    {/* gears */}
    {[
      [60, 120, 46, 10], [345, 210, 58, 12], [70, 420, 62, 12], [330, 470, 40, 9],
      [200, 560, 70, 14], [45, 700, 50, 10], [355, 720, 64, 12], [150, 880, 56, 11], [320, 920, 38, 8],
    ].map(([x, y, r, t], i) => (
      <Gear key={i} x={x} y={y} r={r} teeth={t} color={['#dcc79f', '#cfb58a', '#e4d4b4'][i % 3]} hole="#f4eee3" />
    ))}
    <G stroke="#c9b48c" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.7}>
      <Path d="M0 300 L120 300 L120 380" />
      <Path d="M400 600 L300 600 L300 660 L260 660" />
      <Path d="M0 790 L90 790 L90 840" />
    </G>
  </>
);

const NightTemple = () => (
  <>
    <Sky id="sky8" stops={['#c4b6e6', '#ddd3f1', '#ebe5f6']} />
    {scatter(88, 45, 0, 520).map((p, i) => (
      <Circle key={i} cx={p.x} cy={p.y} r={0.8 + p.r * 1.8} fill="#ffffff" opacity={0.6 + p.r * 0.4} />
    ))}
    <Circle cx={305} cy={110} r={40} fill="#fdf8e4" />
    <Circle cx={322} cy={98} r={36} fill="#c8bbe8" />
    {/* pagoda */}
    <G>
      {[0, 1, 2, 3].map((i) => {
        const y = 230 + i * 70;
        const half = 50 + i * 22;
        return (
          <G key={i}>
            <Rect x={200 - half * 0.6} y={y} width={half * 1.2} height={52} fill="#bcaee0" />
            <Path d={`M${200 - half - 20} ${y + 8} Q 200 ${y - 34} ${200 + half + 20} ${y + 8} Q 200 ${y - 14} ${200 - half - 20} ${y + 8} Z`} fill="#a08cd0" />
            <Rect x={192} y={y + 18} width={16} height={24} rx={3} fill="#f6d58c" opacity={0.85} />
          </G>
        );
      })}
      <Rect x={197} y={170} width={6} height={48} fill="#a08cd0" />
      <Rect x={110} y={510} width={180} height={20} fill="#a08cd0" />
    </G>
    <Hill y={560} amp={30} color="#d3c8ee" />
    {[[60, 600], [340, 640], [120, 760], [290, 800], [70, 900], [330, 920]].map(([x, y], i) => (
      <G key={i}>
        <Line x1={x} y1={y - 40} x2={x} y2={y - 14} stroke="#9a88c8" strokeWidth={2} />
        <Circle cx={x} cy={y} r={22} fill="#f6c26b" opacity={0.25} />
        <Rect x={x - 10} y={y - 14} width={20} height={28} rx={8} fill="#f3b85c" />
      </G>
    ))}
  </>
);

const StarObservatory = () => {
  const stars = scatter(99, 70, 0, 780);
  const constellation = [[60, 300], [110, 260], [150, 290], [200, 240], [240, 280]];
  return (
    <>
      <Sky id="sky9" stops={['#bfc4ec', '#d6d8f2', '#e3e3f6']} />
      {stars.map((p, i) =>
        i % 9 === 0 ? (
          <Sparkle key={i} x={p.x} y={p.y} r={5 + p.r * 4} />
        ) : (
          <Circle key={i} cx={p.x} cy={p.y} r={0.8 + p.r * 1.6} fill="#ffffff" opacity={0.75} />
        )
      )}
      <G stroke="#ffffff" strokeWidth={1.5} opacity={0.7}>
        {constellation.slice(0, -1).map(([x, y], i) => (
          <Line key={i} x1={x} y1={y} x2={constellation[i + 1][0]} y2={constellation[i + 1][1]} />
        ))}
      </G>
      {constellation.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.5} fill="#ffffff" />
      ))}
      <Circle cx={310} cy={150} r={34} fill="#e9c7a6" />
      <Ellipse cx={310} cy={150} rx={58} ry={12} fill="none" stroke="#f5e1cf" strokeWidth={5} />
      <Line x1={80} y1={520} x2={190} y2={470} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <Circle cx={190} cy={470} r={4} fill="#ffffff" />
      <Hill y={800} amp={45} color="#c9c6e8" />
      <Rect x={150} y={770} width={110} height={70} fill="#ecebf8" />
      <Path d="M140 772 Q 205 690 270 772 Z" fill="#dcdaf1" />
      <Rect x={198} y={712} width={14} height={60} fill="#b3b0d8" />
      <Line x1={205} y1={730} x2={260} y2={680} stroke="#8e8bc0" strokeWidth={9} strokeLinecap="round" />
      <Rect x={190} y={800} width={30} height={40} rx={4} fill="#b3b0d8" />
      <Hill y={880} amp={30} color="#b9b5df" flip />
    </>
  );
};

const Summit = () => (
  <>
    <Sky id="sky10" stops={['#fbe6eb', '#f4d3da']} />
    <Cloud x={70} y={80} color="#fff5f7" />
    <Cloud x={330} y={60} s={0.8} color="#fff5f7" />
    {/* back range */}
    <Polygon points="-40,520 70,250 170,520" fill="#e9c6ce" />
    <Polygon points="230,520 340,230 460,520" fill="#e9c6ce" />
    {/* main peak with flag */}
    <Polygon points="40,600 200,130 360,600" fill="#dcaab6" />
    <Polygon points="200,130 160,250 185,236 200,262 220,232 242,252" fill="#ffffff" />
    <Line x1={200} y1={130} x2={200} y2={80} stroke="#8a5a68" strokeWidth={3} />
    <Polygon points="200,80 236,92 200,104" fill="#e07a95" />
    <Polygon points="70,250 52,300 66,294 74,310 86,292" fill="#ffffff" />
    <Polygon points="340,230 320,285 335,278 344,296 358,276" fill="#ffffff" />
    <Bird x={110} y={180} color="#b9808e" />
    <Bird x={290} y={330} color="#b9808e" s={0.8} />
    <Ellipse cx={120} cy={560} rx={150} ry={26} fill="#ffffff" opacity={0.55} />
    <Ellipse cx={300} cy={600} rx={140} ry={22} fill="#ffffff" opacity={0.5} />
    {/* lower slopes */}
    <Polygon points="-60,960 110,640 300,960" fill="#e4bcc6" />
    <Polygon points="140,960 330,680 480,960" fill="#d9aab6" />
    <Polygon points="110,640 92,680 106,676 114,692 126,672" fill="#ffffff" />
    <Polygon points="330,680 312,722 326,716 334,734 348,712" fill="#ffffff" />
    <Ellipse cx={200} cy={860} rx={180} ry={24} fill="#ffffff" opacity={0.45} />
  </>
);

const SCENES: Record<number, () => React.JSX.Element> = {
  1: Garden,
  2: ForestSteps,
  3: Desert,
  4: SunsetPalace,
  5: OceanTower,
  6: FrozenLake,
  7: ClockworkSpire,
  8: NightTemple,
  9: StarObservatory,
  10: Summit,
};

type ChapterSceneProps = {
  chapter: number;
};

// Fills its parent; place it as the first child of a chapter page.
const ChapterScene = ({ chapter }: ChapterSceneProps) => {
  const Scene = SCENES[chapter];
  if (!Scene) return null;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      <Scene />
    </Svg>
  );
};

export default React.memo(ChapterScene);
