// Five bright pictures for the jigsaw, drawn with shapes on a 100 x 100
// canvas. Each is a <G> group, so it can be drawn whole (thumbnails, the
// "peek" preview) or clipped into pieces.

import React from 'react';
import { G, Rect, Circle, Ellipse, Path, Polygon, Line } from 'react-native-svg';

export type Picture = {
  id: string;
  name: string;
  emoji: string;
  Draw: React.ComponentType;
};

// A fixed scatter of points, so stars and dots are the same every time.
const dots = (count: number, seed: number) => {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => ({ x: next() * 100, y: next() * 100, r: next() }));
};

const Cloud = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <G transform={`translate(${x} ${y}) scale(${scale})`}>
    <Ellipse cx={0} cy={0} rx={7} ry={5} fill="#FFFFFF" />
    <Ellipse cx={7} cy={-3} rx={7} ry={6} fill="#FFFFFF" />
    <Ellipse cx={13} cy={1} rx={6} ry={4.5} fill="#FFFFFF" />
  </G>
);

// --- 1. Sunny Farm ---------------------------------------------------------
const Farm = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#8FD3FF" />
    <Rect x={0} y={0} width={100} height={28} fill="#74C6F7" />
    <Circle cx={82} cy={17} r={14} fill="#FFE8A3" />
    <Circle cx={82} cy={17} r={10} fill="#FFD43B" />
    <Cloud x={14} y={16} />
    <Cloud x={46} y={26} scale={0.8} />
    <Ellipse cx={22} cy={78} rx={48} ry={24} fill="#8CE99A" />
    <Ellipse cx={82} cy={82} rx={46} ry={22} fill="#69DB7C" />
    <Rect x={0} y={84} width={100} height={16} fill="#51CF66" />
    {/* barn */}
    <Rect x={52} y={50} width={30} height={34} fill="#FA5252" />
    <Polygon points="48,52 67,35 86,52" fill="#C92A2A" />
    <Rect x={62} y={54} width={10} height={7} fill="#FFE066" />
    <Rect x={60} y={66} width={14} height={18} fill="#FFF5F5" />
    <Line x1={60} y1={66} x2={74} y2={84} stroke="#FA5252" strokeWidth={1.5} />
    <Line x1={74} y1={66} x2={60} y2={84} stroke="#FA5252" strokeWidth={1.5} />
    {/* tree */}
    <Rect x={17} y={58} width={5} height={26} fill="#A0522D" />
    <Circle cx={19.5} cy={52} r={12} fill="#2F9E44" />
    <Circle cx={14} cy={50} r={2} fill="#FF6B6B" />
    <Circle cx={24} cy={55} r={2} fill="#FF6B6B" />
    <Circle cx={20} cy={45} r={2} fill="#FF6B6B" />
    {/* fence */}
    {[2, 10, 18, 26, 34, 42].map((x) => (
      <Rect key={x} x={x} y={76} width={3} height={14} fill="#FFFFFF" />
    ))}
    <Rect x={0} y={79} width={47} height={2.5} fill="#FFFFFF" />
    <Rect x={0} y={85} width={47} height={2.5} fill="#FFFFFF" />
    {/* flowers */}
    {[
      [8, 94, '#F783AC'],
      [30, 96, '#FFD43B'],
      [55, 93, '#9775FA'],
      [90, 95, '#FF8787'],
      [75, 97, '#FFFFFF'],
    ].map(([x, y, c]) => (
      <G key={`${x}`}>
        <Circle cx={x as number} cy={y as number} r={2.4} fill={c as string} />
        <Circle cx={x as number} cy={y as number} r={0.9} fill="#FFD43B" />
      </G>
    ))}
  </G>
));

// --- 2. Rocket Trip --------------------------------------------------------
const STARS = dots(40, 7);
const Space = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#1B1F4B" />
    <Rect x={0} y={60} width={100} height={40} fill="#262B66" />
    {STARS.map((s, i) => (
      <Circle
        key={i}
        cx={s.x}
        cy={s.y}
        r={0.5 + s.r * 0.9}
        fill={i % 3 === 0 ? '#FFE066' : '#FFFFFF'}
      />
    ))}
    {/* ringed planet */}
    <Circle cx={24} cy={28} r={14} fill="#FF922B" />
    <Path d="M14 22 Q24 18 34 24" stroke="#FFC078" strokeWidth={3} fill="none" />
    <Path d="M12 32 Q24 28 37 33" stroke="#E8590C" strokeWidth={2.5} fill="none" />
    <Ellipse cx={24} cy={28} rx={22} ry={5} stroke="#FFD8A8" strokeWidth={2.5} fill="none" transform="rotate(-15 24 28)" />
    {/* moon */}
    <Circle cx={80} cy={82} r={17} fill="#E9ECEF" />
    <Circle cx={74} cy={78} r={4} fill="#CED4DA" />
    <Circle cx={86} cy={88} r={3} fill="#CED4DA" />
    <Circle cx={85} cy={75} r={2} fill="#CED4DA" />
    {/* little green planet */}
    <Circle cx={86} cy={20} r={7} fill="#51CF66" />
    <Circle cx={84} cy={18} r={2} fill="#8CE99A" />
    {/* rocket */}
    <G transform="rotate(30 50 52)">
      <Path d="M44 70 Q50 92 56 70 Z" fill="#FFA94D" />
      <Path d="M46.5 70 Q50 84 53.5 70 Z" fill="#FFE066" />
      <Polygon points="43,56 34,72 43,68" fill="#FA5252" />
      <Polygon points="57,56 66,72 57,68" fill="#FA5252" />
      <Path d="M50 20 C59 31 59 53 56 70 L44 70 C41 53 41 31 50 20 Z" fill="#F8F9FA" />
      <Path d="M50 20 C54 25 56.5 30 57.5 35 L42.5 35 C43.5 30 46 25 50 20 Z" fill="#FA5252" />
      <Circle cx={50} cy={45} r={5.5} fill="#4DABF7" stroke="#1971C2" strokeWidth={1.5} />
      <Rect x={47} y={60} width={6} height={10} fill="#FA5252" />
    </G>
  </G>
));

// --- 3. Under the Sea ------------------------------------------------------
const BUBBLES = dots(10, 21);
const Fish = ({ x, y, color, flip = false }: { x: number; y: number; color: string; flip?: boolean }) => (
  <G transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
    <Polygon points="-9,0 -15,-6 -15,6" fill={color} />
    <Ellipse cx={0} cy={0} rx={10} ry={6.5} fill={color} />
    <Path d="M-2 -6 Q2 -10 5 -5" fill={color} />
    <Ellipse cx={1} cy={0} rx={2} ry={5.5} fill="#FFFFFF" opacity={0.5} />
    <Circle cx={5} cy={-1.5} r={1.8} fill="#FFFFFF" />
    <Circle cx={5.4} cy={-1.5} r={0.9} fill="#1B1F4B" />
  </G>
);
const Sea = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#339AF0" />
    <Rect x={0} y={0} width={100} height={30} fill="#74C0FC" />
    <Rect x={0} y={30} width={100} height={25} fill="#4DABF7" />
    <Path d="M0 82 Q20 74 40 82 T80 80 T100 78 L100 100 L0 100 Z" fill="#FFE8A3" />
    {/* seaweed */}
    <Path d="M10 92 Q4 80 10 70 Q16 60 10 50" stroke="#2F9E44" strokeWidth={4} fill="none" strokeLinecap="round" />
    <Path d="M18 92 Q24 82 18 72 Q12 64 18 58" stroke="#40C057" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    <Path d="M88 90 Q94 78 88 66 Q82 56 88 46" stroke="#2F9E44" strokeWidth={4} fill="none" strokeLinecap="round" />
    {/* coral */}
    <Path d="M66 88 L66 74 M66 80 L60 72 M66 78 L72 68" stroke="#FF8787" strokeWidth={3.5} strokeLinecap="round" />
    {/* starfish */}
    <Polygon
      points="40,82 42,87 47,87 43,90 45,95 40,92 35,95 37,90 33,87 38,87"
      fill="#FF6B6B"
    />
    <Fish x={30} y={30} color="#FF922B" />
    <Fish x={70} y={46} color="#F783AC" flip />
    <Fish x={44} y={62} color="#FFD43B" />
    <Fish x={78} y={18} color="#63E6BE" flip />
    {BUBBLES.map((b, i) => (
      <Circle key={i} cx={b.x} cy={b.y * 0.7} r={1 + b.r * 1.8} fill="none" stroke="#E7F5FF" strokeWidth={0.8} />
    ))}
  </G>
));

// --- 4. Rainbow Castle -----------------------------------------------------
const RAINBOW = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA'];
const Castle = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#FFDEEB" />
    <Rect x={0} y={0} width={100} height={35} fill="#FCC2D7" />
    {RAINBOW.map((c, i) => {
      const r = 46 - i * 4;
      return (
        <Path key={c} d={`M${50 - r} 72 A${r} ${r} 0 0 1 ${50 + r} 72`} stroke={c} strokeWidth={4.2} fill="none" />
      );
    })}
    <Cloud x={2} y={70} scale={1.1} />
    <Cloud x={80} y={70} scale={1.1} />
    {/* towers */}
    <Rect x={20} y={44} width={14} height={46} fill="#9775FA" />
    <Rect x={66} y={44} width={14} height={46} fill="#9775FA" />
    <Polygon points="18,45 27,28 36,45" fill="#F06595" />
    <Polygon points="64,45 73,28 82,45" fill="#F06595" />
    <Line x1={27} y1={28} x2={27} y2={20} stroke="#5F3DC4" strokeWidth={1} />
    <Polygon points="27,20 34,22.5 27,25" fill="#FFD43B" />
    <Line x1={73} y1={28} x2={73} y2={20} stroke="#5F3DC4" strokeWidth={1} />
    <Polygon points="73,20 80,22.5 73,25" fill="#FFD43B" />
    {/* keep */}
    <Rect x={34} y={54} width={32} height={36} fill="#B197FC" />
    {[34, 42, 50, 58].map((x) => (
      <Rect key={x} x={x} y={49} width={5} height={6} fill="#B197FC" />
    ))}
    <Path d="M43 90 L43 76 Q50 68 57 76 L57 90 Z" fill="#5F3DC4" />
    <Circle cx={50} cy={63} r={4} fill="#FFE066" />
    <Rect x={24} y={56} width={6} height={8} rx={3} fill="#FFE066" />
    <Rect x={70} y={56} width={6} height={8} rx={3} fill="#FFE066" />
    <Rect x={0} y={88} width={100} height={12} fill="#8CE99A" />
    <Path d="M43 100 L46 90 L54 90 L57 100 Z" fill="#E9ECEF" />
  </G>
));

// --- 5. Sweet Treats -------------------------------------------------------
const SPRINKLES = dots(14, 33);
const SPRINKLE_COLORS = ['#FFFFFF', '#FFD43B', '#4DABF7', '#69DB7C'];
const Sweets = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#FFF0F6" />
    {dots(26, 5).map((d, i) => (
      <Circle key={i} cx={d.x} cy={d.y} r={2.5} fill="#FFDEEB" />
    ))}
    {/* ice cream */}
    <Polygon points="32,56 50,96 68,56" fill="#E8A15A" />
    <Path d="M36 64 L58 64 M39 72 L57 72 M43 80 L55 80" stroke="#C97A35" strokeWidth={1.2} />
    <Path d="M40 58 L54 88 M50 58 L58 76 M60 58 L46 88" stroke="#C97A35" strokeWidth={1.2} />
    <Circle cx={39} cy={52} r={12} fill="#F783AC" />
    <Circle cx={61} cy={52} r={12} fill="#63E6BE" />
    <Circle cx={50} cy={38} r={13} fill="#FFF3BF" />
    <Circle cx={50} cy={23} r={4} fill="#FA5252" />
    <Path d="M50 19 Q53 13 57 12" stroke="#2F9E44" strokeWidth={1.2} fill="none" />
    {/* lollipop */}
    <Rect x={82} y={40} width={3} height={52} fill="#FFFFFF" stroke="#E9ECEF" strokeWidth={0.5} />
    <Circle cx={83.5} cy={30} r={13} fill="#FF6B6B" />
    <Circle cx={83.5} cy={30} r={9} fill="#FFFFFF" />
    <Circle cx={83.5} cy={30} r={6} fill="#4DABF7" />
    <Circle cx={83.5} cy={30} r={2.5} fill="#FFD43B" />
    {/* donut */}
    <Circle cx={17} cy={82} r={14} fill="#D9480F" />
    <Circle cx={17} cy={81} r={12} fill="#F06595" />
    <Circle cx={17} cy={82} r={4.5} fill="#FFF0F6" />
    {SPRINKLES.map((s, i) => {
      const angle = (i / SPRINKLES.length) * Math.PI * 2;
      const dist = 7 + s.r * 2.5;
      const x = 17 + Math.cos(angle) * dist;
      const y = 81 + Math.sin(angle) * dist;
      return (
        <Rect
          key={i}
          x={x - 1.2}
          y={y - 0.5}
          width={2.4}
          height={1}
          fill={SPRINKLE_COLORS[i % 4]}
          transform={`rotate(${s.x * 3.6} ${x} ${y})`}
        />
      );
    })}
    {/* wrapped candy */}
    <Polygon points="6,16 12,20 6,24" fill="#9775FA" />
    <Polygon points="30,16 24,20 30,24" fill="#9775FA" />
    <Ellipse cx={18} cy={20} rx={7.5} ry={5.5} fill="#B197FC" />
    <Path d="M14 16 L16 24 M19 15 L21 25" stroke="#FFFFFF" strokeWidth={1.2} />
  </G>
));

// --- 6. Snowy Day ----------------------------------------------------------
const SNOW = dots(34, 11);
const Pine = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Rect x={-1.5} y={0} width={3} height={6} fill="#8B5A2B" />
    <Polygon points="-9,2 0,-10 9,2" fill="#2B8A3E" />
    <Polygon points="-7,-5 0,-16 7,-5" fill="#37B24D" />
    <Polygon points="-4.5,-12 0,-20 4.5,-12" fill="#51CF66" />
  </G>
);
const Snow = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#A5D8FF" />
    <Rect x={0} y={0} width={100} height={30} fill="#74C0FC" />
    <Ellipse cx={20} cy={74} rx={50} ry={18} fill="#E7F5FF" />
    <Ellipse cx={85} cy={78} rx={40} ry={16} fill="#F1F8FF" />
    <Rect x={0} y={80} width={100} height={20} fill="#FFFFFF" />
    <Pine x={12} y={66} s={1.3} />
    <Pine x={27} y={70} />
    <Pine x={88} y={70} s={1.4} />
    {/* snowman */}
    <Circle cx={58} cy={80} r={14} fill="#FFFFFF" stroke="#D0EBFF" strokeWidth={1} />
    <Circle cx={58} cy={60} r={10} fill="#FFFFFF" stroke="#D0EBFF" strokeWidth={1} />
    <Circle cx={58} cy={44} r={8} fill="#FFFFFF" stroke="#D0EBFF" strokeWidth={1} />
    <Rect x={51} y={33} width={14} height={3} fill="#343A40" />
    <Rect x={53} y={24} width={10} height={10} fill="#343A40" />
    <Rect x={53} y={31} width={10} height={2} fill="#FA5252" />
    <Circle cx={55} cy={43} r={1.1} fill="#343A40" />
    <Circle cx={61} cy={43} r={1.1} fill="#343A40" />
    <Polygon points="58,45.5 66,47 58,48" fill="#FF922B" />
    <Path d="M50 52 Q58 56 66 52 L66 55 Q58 59 50 55 Z" fill="#FA5252" />
    <Rect x={62} y={54} width={4} height={10} fill="#FA5252" />
    <Circle cx={58} cy={58} r={1.2} fill="#343A40" />
    <Circle cx={58} cy={63} r={1.2} fill="#343A40" />
    <Line x1={48} y1={58} x2={38} y2={51} stroke="#8B5A2B" strokeWidth={1.5} />
    <Line x1={68} y1={58} x2={78} y2={51} stroke="#8B5A2B" strokeWidth={1.5} />
    {SNOW.map((f, i) => (
      <Circle key={i} cx={f.x} cy={f.y * 0.85} r={0.6 + f.r * 1.1} fill="#FFFFFF" />
    ))}
  </G>
));

// --- 7. Dino Land ----------------------------------------------------------
const Dino = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#FFD8A8" />
    <Rect x={0} y={0} width={100} height={30} fill="#FFC078" />
    <Circle cx={18} cy={18} r={9} fill="#FFF3BF" />
    {/* volcano */}
    <Polygon points="52,70 72,24 82,24 100,70" fill="#8C6D62" />
    <Polygon points="72,24 82,24 79,32 76,28 73,33" fill="#FA5252" />
    <Path d="M74 22 Q70 12 76 6 Q80 12 84 8 Q86 16 80 22 Z" fill="#ADB5BD" opacity={0.8} />
    <Path d="M77 30 Q75 40 78 48" stroke="#FA5252" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    <Rect x={0} y={70} width={100} height={30} fill="#94D82D" />
    <Rect x={0} y={86} width={100} height={14} fill="#74B816" />
    {/* palm tree */}
    <Path d="M14 90 Q12 70 18 52" stroke="#A0522D" strokeWidth={3.5} fill="none" />
    <Path d="M18 52 Q8 46 2 52 Q10 48 18 54 Z" fill="#2F9E44" />
    <Path d="M18 52 Q28 44 36 50 Q26 48 18 55 Z" fill="#2F9E44" />
    <Path d="M18 52 Q12 40 18 34 Q16 44 20 52 Z" fill="#40C057" />
    <Path d="M18 52 Q26 38 32 40 Q24 44 19 53 Z" fill="#40C057" />
    {/* dinosaur */}
    <Path d="M30 78 Q22 74 16 82 Q26 80 32 84 Z" fill="#40C057" />
    <Ellipse cx={46} cy={76} rx={18} ry={11} fill="#51CF66" />
    <Path d="M56 72 Q62 56 62 46 L70 46 Q70 60 62 78 Z" fill="#51CF66" />
    <Ellipse cx={68} cy={44} rx={9} ry={6} fill="#51CF66" />
    <Circle cx={70} cy={42} r={1.6} fill="#FFFFFF" />
    <Circle cx={70.5} cy={42} r={0.8} fill="#212529" />
    <Path d="M71 47 Q74 48 76 46" stroke="#2B8A3E" strokeWidth={0.8} fill="none" />
    {[34, 41, 48, 55].map((x, i) => (
      <Polygon key={x} points={`${x - 3},${66 + (i === 3 ? 1 : 0)} ${x},${60 + (i === 3 ? 1 : 0)} ${x + 3},${66 + (i === 3 ? 1 : 0)}`} fill="#FCC419" />
    ))}
    <Rect x={36} y={84} width={6} height={9} rx={2} fill="#40C057" />
    <Rect x={50} y={84} width={6} height={9} rx={2} fill="#40C057" />
    <Circle cx={44} cy={74} r={2} fill="#8CE99A" />
    <Circle cx={52} cy={79} r={1.5} fill="#8CE99A" />
    {/* egg */}
    <Ellipse cx={86} cy={88} rx={5} ry={6.5} fill="#FFF9DB" />
    <Circle cx={84} cy={86} r={1.2} fill="#74C0FC" />
    <Circle cx={88} cy={90} r={1} fill="#74C0FC" />
  </G>
));

// --- 8. Balloon Sky --------------------------------------------------------
const Balloon = ({ x, y, s, a, b }: { x: number; y: number; s: number; a: string; b: string }) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Circle cx={0} cy={0} r={12} fill={a} />
    <Path d="M-4 -11.3 Q-6 0 -4 11.3 L4 11.3 Q6 0 4 -11.3 Z" fill={b} />
    <Path d="M-12 0 Q-10 8 -4 11.3 L4 11.3 Q10 8 12 0 Q6 4 0 4 Q-6 4 -12 0 Z" fill={a} opacity={0.6} />
    <Line x1={-5} y1={11} x2={-3} y2={19} stroke="#868E96" strokeWidth={0.6} />
    <Line x1={5} y1={11} x2={3} y2={19} stroke="#868E96" strokeWidth={0.6} />
    <Rect x={-4} y={19} width={8} height={5} rx={1} fill="#A0522D" />
  </G>
);
const Balloons = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#D0EBFF" />
    <Rect x={0} y={0} width={100} height={25} fill="#A5D8FF" />
    <Cloud x={6} y={30} />
    <Cloud x={62} y={14} scale={0.9} />
    <Cloud x={70} y={58} scale={0.8} />
    <Ellipse cx={20} cy={96} rx={45} ry={18} fill="#8CE99A" />
    <Ellipse cx={80} cy={98} rx={45} ry={16} fill="#69DB7C" />
    <Balloon x={30} y={30} s={1.4} a="#FF6B6B" b="#FFD43B" />
    <Balloon x={70} y={40} s={1.1} a="#4DABF7" b="#FFFFFF" />
    <Balloon x={52} y={66} s={0.9} a="#9775FA" b="#F783AC" />
    <Balloon x={86} y={18} s={0.6} a="#FFA94D" b="#69DB7C" />
    <Balloon x={12} y={62} s={0.7} a="#20C997" b="#FFF3BF" />
  </G>
));

// --- 9. Choo-Choo Train ----------------------------------------------------
const Wheel = ({ x }: { x: number }) => (
  <G>
    <Circle cx={x} cy={80} r={4.5} fill="#343A40" />
    <Circle cx={x} cy={80} r={1.6} fill="#ADB5BD" />
  </G>
);
const Train = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#FFF3BF" />
    <Rect x={0} y={0} width={100} height={22} fill="#FFE066" />
    <Circle cx={84} cy={16} r={9} fill="#FF922B" />
    <Ellipse cx={20} cy={66} rx={40} ry={20} fill="#B2F2BB" />
    <Ellipse cx={75} cy={64} rx={40} ry={22} fill="#8CE99A" />
    <Rect x={0} y={76} width={100} height={24} fill="#69DB7C" />
    {/* track */}
    <Rect x={0} y={84} width={100} height={2} fill="#868E96" />
    {[2, 10, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98].map((x) => (
      <Rect key={x} x={x - 2} y={85} width={4} height={3} fill="#A0522D" />
    ))}
    {/* smoke */}
    <Circle cx={74} cy={38} r={4} fill="#FFFFFF" />
    <Circle cx={68} cy={30} r={5} fill="#FFFFFF" />
    <Circle cx={60} cy={24} r={6} fill="#FFFFFF" />
    {/* engine */}
    <Rect x={64} y={58} width={26} height={20} rx={2} fill="#FA5252" />
    <Rect x={80} y={48} width={14} height={30} rx={2} fill="#E03131" />
    <Rect x={83} y={52} width={8} height={7} fill="#A5D8FF" />
    <Rect x={78} y={45} width={18} height={4} fill="#C92A2A" />
    <Rect x={70} y={44} width={6} height={14} fill="#343A40" />
    <Polygon points="62,78 58,78 64,70" fill="#FFD43B" />
    <Wheel x={70} />
    <Wheel x={86} />
    {/* carriages */}
    <Rect x={33} y={60} width={26} height={18} rx={2} fill="#4DABF7" />
    <Rect x={36} y={63} width={8} height={7} fill="#E7F5FF" />
    <Rect x={48} y={63} width={8} height={7} fill="#E7F5FF" />
    <Wheel x={39} />
    <Wheel x={53} />
    <Rect x={2} y={60} width={26} height={18} rx={2} fill="#FCC419" />
    <Rect x={5} y={63} width={8} height={7} fill="#FFF9DB" />
    <Rect x={17} y={63} width={8} height={7} fill="#FFF9DB" />
    <Wheel x={8} />
    <Wheel x={22} />
    <Rect x={28} y={72} width={5} height={2} fill="#343A40" />
    <Rect x={59} y={72} width={5} height={2} fill="#343A40" />
  </G>
));

// --- 10. Butterfly Garden --------------------------------------------------
const Flower = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <G>
    <Line x1={x} y1={y} x2={x} y2={100} stroke="#2F9E44" strokeWidth={1.5} />
    {[0, 72, 144, 216, 288].map((a) => (
      <Circle
        key={a}
        cx={x + Math.cos((a * Math.PI) / 180) * 3.5}
        cy={y + Math.sin((a * Math.PI) / 180) * 3.5}
        r={3}
        fill={c}
      />
    ))}
    <Circle cx={x} cy={y} r={2} fill="#FFD43B" />
  </G>
);
const Garden = React.memo(() => (
  <G>
    <Rect x={0} y={0} width={100} height={100} fill="#E6FCF5" />
    <Rect x={0} y={0} width={100} height={30} fill="#C3FAE8" />
    <Circle cx={88} cy={12} r={7} fill="#FFE066" />
    <Rect x={0} y={78} width={100} height={22} fill="#8CE99A" />
    <Path d="M0 78 Q10 72 20 78 T40 78 T60 78 T80 78 T100 78 L100 82 L0 82 Z" fill="#69DB7C" />
    <Flower x={10} y={74} c="#F783AC" />
    <Flower x={26} y={82} c="#FFA94D" />
    <Flower x={76} y={76} c="#9775FA" />
    <Flower x={92} y={84} c="#FF6B6B" />
    <Flower x={60} y={86} c="#4DABF7" />
    {/* big butterfly */}
    <G transform="rotate(-10 50 46)">
      <Ellipse cx={37} cy={36} rx={14} ry={16} fill="#FF8787" transform="rotate(-20 37 36)" />
      <Ellipse cx={63} cy={36} rx={14} ry={16} fill="#FF8787" transform="rotate(20 63 36)" />
      <Ellipse cx={39} cy={58} rx={10} ry={11} fill="#FFA94D" transform="rotate(20 39 58)" />
      <Ellipse cx={61} cy={58} rx={10} ry={11} fill="#FFA94D" transform="rotate(-20 61 58)" />
      <Circle cx={36} cy={34} r={5} fill="#FFE066" />
      <Circle cx={64} cy={34} r={5} fill="#FFE066" />
      <Circle cx={39} cy={59} r={3.5} fill="#FFF3BF" />
      <Circle cx={61} cy={59} r={3.5} fill="#FFF3BF" />
      <Ellipse cx={50} cy={47} rx={3} ry={17} fill="#5F3DC4" />
      <Circle cx={50} cy={29} r={4} fill="#5F3DC4" />
      <Path d="M48 26 Q44 16 40 14" stroke="#5F3DC4" strokeWidth={1.2} fill="none" />
      <Path d="M52 26 Q56 16 60 14" stroke="#5F3DC4" strokeWidth={1.2} fill="none" />
      <Circle cx={40} cy={14} r={1.5} fill="#5F3DC4" />
      <Circle cx={60} cy={14} r={1.5} fill="#5F3DC4" />
    </G>
    {/* little butterflies */}
    <G transform="translate(16 22) scale(0.35)">
      <Ellipse cx={-8} cy={0} rx={8} ry={10} fill="#74C0FC" />
      <Ellipse cx={8} cy={0} rx={8} ry={10} fill="#74C0FC" />
      <Ellipse cx={0} cy={0} rx={2} ry={9} fill="#343A40" />
    </G>
    <G transform="translate(84 52) scale(0.3)">
      <Ellipse cx={-8} cy={0} rx={8} ry={10} fill="#B197FC" />
      <Ellipse cx={8} cy={0} rx={8} ry={10} fill="#B197FC" />
      <Ellipse cx={0} cy={0} rx={2} ry={9} fill="#343A40" />
    </G>
  </G>
));

export const PICTURES: Picture[] = [
  { id: 'farm', name: 'Sunny Farm', emoji: '🐮', Draw: Farm },
  { id: 'space', name: 'Rocket Trip', emoji: '🚀', Draw: Space },
  { id: 'sea', name: 'Under the Sea', emoji: '🐠', Draw: Sea },
  { id: 'castle', name: 'Rainbow Castle', emoji: '🏰', Draw: Castle },
  { id: 'sweets', name: 'Sweet Treats', emoji: '🍭', Draw: Sweets },
  { id: 'snow', name: 'Snowy Day', emoji: '⛄', Draw: Snow },
  { id: 'dino', name: 'Dino Land', emoji: '🦕', Draw: Dino },
  { id: 'balloons', name: 'Balloon Sky', emoji: '🎈', Draw: Balloons },
  { id: 'train', name: 'Choo-Choo Train', emoji: '🚂', Draw: Train },
  { id: 'garden', name: 'Butterfly Garden', emoji: '🦋', Draw: Garden },
];

const mirroredCache = new Map<string, Picture>();

/**
 * A picture, optionally flipped left-to-right. The mirrored version is
 * built once per picture and reused, so memoised pieces see the same object.
 */
export const pictureVariant = (index: number, mirrored: boolean): Picture => {
  const base = PICTURES[index % PICTURES.length];
  if (!mirrored) return base;
  const hit = mirroredCache.get(base.id);
  if (hit) return hit;
  const Inner = base.Draw;
  const Mirrored = React.memo(() => (
    <G transform="translate(100 0) scale(-1 1)">
      <Inner />
    </G>
  ));
  const made: Picture = { ...base, id: `${base.id}-mirrored`, Draw: Mirrored };
  mirroredCache.set(base.id, made);
  return made;
};
