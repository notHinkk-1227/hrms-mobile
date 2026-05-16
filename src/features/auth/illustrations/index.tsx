import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { tokens } from '@shared/theme/tokens';

const SIZE = 220;

export function GpsAttendanceIllustration(): React.JSX.Element {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 220 220">
      {/* Backdrop circle */}
      <Circle cx={110} cy={110} r={100} fill={tokens.color.blue50} />
      {/* Map grid */}
      <G opacity={0.4}>
        <Path d="M40 80 L180 80 M40 110 L180 110 M40 140 L180 140" stroke={tokens.color.blue200} strokeWidth={1.5} />
        <Path d="M70 55 L70 165 M110 55 L110 165 M150 55 L150 165" stroke={tokens.color.blue200} strokeWidth={1.5} />
      </G>
      {/* Pin shadow */}
      <Circle cx={110} cy={150} r={10} fill="rgba(46,120,217,0.2)" />
      {/* Big pin */}
      <Path
        d="M110 65 C92 65 80 78 80 96 C80 116 110 145 110 145 C110 145 140 116 140 96 C140 78 128 65 110 65 Z"
        fill={tokens.color.blue500}
      />
      <Circle cx={110} cy={94} r={8} fill={tokens.color.white} />
      {/* Small pins */}
      <Path
        d="M55 105 C49 105 45 110 45 116 C45 124 55 135 55 135 C55 135 65 124 65 116 C65 110 61 105 55 105 Z"
        fill={tokens.color.green500}
      />
      <Path
        d="M165 130 C159 130 155 134 155 140 C155 147 165 156 165 156 C165 156 175 147 175 140 C175 134 171 130 165 130 Z"
        fill={tokens.color.yellow400}
      />
    </Svg>
  );
}

export function DigitalFormIllustration(): React.JSX.Element {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 220 220">
      <Circle cx={110} cy={110} r={100} fill={tokens.color.green50} />
      {/* Back card */}
      <Rect x={55} y={50} width={110} height={130} rx={12} fill={tokens.color.yellow100} />
      {/* Middle card */}
      <Rect x={48} y={58} width={110} height={130} rx={12} fill={tokens.color.green200} />
      {/* Front card */}
      <Rect x={40} y={66} width={110} height={130} rx={12} fill={tokens.color.white} stroke={tokens.color.green500} strokeWidth={1.5} />
      {/* Form lines */}
      <Rect x={52} y={82} width={40} height={5} rx={2.5} fill={tokens.color.green700} />
      <Rect x={52} y={100} width={86} height={8} rx={4} fill={tokens.color.green50} />
      <Rect x={52} y={120} width={40} height={5} rx={2.5} fill={tokens.color.green700} />
      <Rect x={52} y={138} width={86} height={8} rx={4} fill={tokens.color.green50} />
      <Rect x={52} y={158} width={50} height={5} rx={2.5} fill={tokens.color.green700} />
      <Rect x={52} y={172} width={86} height={14} rx={7} fill={tokens.color.green500} />
      {/* Checkmark badge top-right */}
      <Circle cx={150} cy={70} r={18} fill={tokens.color.green500} />
      <Path
        d="M141 70 L148 77 L159 64"
        stroke={tokens.color.white}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DashboardIllustration(): React.JSX.Element {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 220 220">
      <Circle cx={110} cy={110} r={100} fill={tokens.color.yellow50} />
      {/* Center avatar */}
      <Circle cx={110} cy={110} r={30} fill={tokens.color.yellow400} />
      <Circle cx={110} cy={105} r={10} fill={tokens.color.white} />
      <Path d="M93 130 Q110 117 127 130" stroke={tokens.color.white} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* Surrounding small avatars */}
      <Circle cx={50} cy={70} r={18} fill={tokens.color.blue500} />
      <Circle cx={50} cy={67} r={6} fill={tokens.color.white} />
      <Path d="M40 82 Q50 75 60 82" stroke={tokens.color.white} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Circle cx={170} cy={70} r={18} fill={tokens.color.green500} />
      <Circle cx={170} cy={67} r={6} fill={tokens.color.white} />
      <Path d="M160 82 Q170 75 180 82" stroke={tokens.color.white} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Circle cx={50} cy={160} r={18} fill={tokens.color.error} />
      <Circle cx={50} cy={157} r={6} fill={tokens.color.white} />
      <Path d="M40 172 Q50 165 60 172" stroke={tokens.color.white} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Circle cx={170} cy={160} r={18} fill={tokens.semantic.brand} />
      <Circle cx={170} cy={157} r={6} fill={tokens.color.white} />
      <Path d="M160 172 Q170 165 180 172" stroke={tokens.color.white} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* Dashed connecting lines */}
      <G stroke={tokens.color.yellow400} strokeWidth={2} fill="none" strokeDasharray="3 4" opacity={0.6}>
        <Path d="M68 78 L92 100" />
        <Path d="M152 78 L128 100" />
        <Path d="M68 154 L92 130" />
        <Path d="M152 154 L128 130" />
      </G>
    </Svg>
  );
}
