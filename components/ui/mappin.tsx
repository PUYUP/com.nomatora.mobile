import React from 'react';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  G,
  Path,
  Circle,
  Ellipse,
  Filter,
  FeDropShadow,
} from 'react-native-svg';

/**
 * MapPin Component
 * Replicates the Google Maps-style location pin SVG.
 * Usage: <MapPin width={120} height={150} />
 */
const MapPin = ({ width = 90, height = 160 }) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 90 160"
    >
      <Defs>
        {/* Main red radial gradient for the pin body */}
        <RadialGradient
          id="pinBodyGradient"
          cx="38%"
          cy="28%"
          r="65%"
          fx="38%"
          fy="28%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0%" stopColor="#F4645A" />
          <Stop offset="40%" stopColor="#E8453C" />
          <Stop offset="80%" stopColor="#CC2C24" />
          <Stop offset="100%" stopColor="#B52220" />
        </RadialGradient>

        {/* Highlight glare gradient (top-left white sheen) */}
        <RadialGradient
          id="glareGradient"
          cx="33%"
          cy="22%"
          r="52%"
          fx="33%"
          fy="22%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>

        {/* Dark inner circle gradient */}
        <RadialGradient
          id="holeGradient"
          cx="45%"
          cy="40%"
          r="60%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0%" stopColor="#A83830" />
          <Stop offset="100%" stopColor="#7A2218" />
        </RadialGradient>

        {/* Subtle shadow under the pin tail */}
        <RadialGradient
          id="shadowGradient"
          cx="50%"
          cy="50%"
          r="50%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0%" stopColor="#000000" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* ── Drop shadow ellipse under the pin ── */}
      <Ellipse
        cx="45"
        cy="154"
        rx="16"
        ry="4"
        fill="url(#shadowGradient)"
      />

      {/* ── Pin body: slim with concave sides + smooth taper to tip ── */}
      <Path
        d={`
          M 45 150
          C 45 145, 43 137, 41 127
          C 38 117, 37 108, 30 99
          C 26 90,  10 78,  8  58
          A 37 37 0 1 1 82 58
          C 80 78,  64 90,  60 99
          C 53 108, 52 117, 49 127
          C 47 137, 45 145, 45 150
          Z
        `}
        fill="url(#pinBodyGradient)"
      />

      {/* ── Glare / highlight on top-left ── */}
      <Path
        d={`
          M 45 150
          C 45 145, 43 137, 41 127
          C 38 117, 37 108, 30 99
          C 26 90,  10 78,  8  58
          A 37 37 0 1 1 82 58
          C 80 78,  64 90,  60 99
          C 53 108, 52 117, 49 127
          C 47 137, 45 145, 45 150
          Z
        `}
        fill="url(#glareGradient)"
      />

      {/* ── Dark center hole / inner circle ── */}
      <Circle
        cx="45"
        cy="58"
        r="15"
        fill="url(#holeGradient)"
      />

      {/* ── Rim highlight on hole ── */}
      <Circle
        cx="45"
        cy="58"
        r="15"
        fill="none"
        stroke="#7B2018"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />

      {/* ── Small specular highlight dot inside hole ── */}
      <Circle
        cx="40"
        cy="53"
        r="3.5"
        fill="#FFFFFF"
        fillOpacity="0.13"
      />
    </Svg>
  );
};

export default MapPin;


/* ─────────────────────────────────────────────
   USAGE EXAMPLE (in your screen/component):

   import MapPin from './MapPin';

   export default function App() {
     return (
       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
         <MapPin width={90} height={160} />
       </View>
     );
   }
───────────────────────────────────────────── */