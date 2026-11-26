// Isometric projection helper (2:1 axonometric, origin at top floor corner 320, 128)
function iso(x: number, y: number, z = 0): [number, number] {
  const ox = 320;
  const oy = 128;
  const scale = 25;
  const px = ox + (x - y) * scale;
  const py = oy + (x + y) * (scale * 0.5) - z * scale;
  return [Math.round(px * 10) / 10, Math.round(py * 10) / 10];
}

function pts(coords: Array<[number, number, number?]>): string {
  return coords.map(([x, y, z = 0]) => iso(x, y, z).join(",")).join(" ");
}

function IsoBox({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  topFill = "#ffffff",
  leftFill = "#d8eee6",
  rightFill = "#bfe0d4",
  stroke = "#0a3934",
  strokeWidth = 1.35,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  topFill?: string;
  leftFill?: string;
  rightFill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
      <polygon
        points={pts([
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={leftFill}
      />
      <polygon
        points={pts([
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x + w, y, z + h],
        ])}
        fill={rightFill}
      />
      <polygon
        points={pts([
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={topFill}
      />
    </g>
  );
}

function CeilingCamera({
  x,
  y,
  z,
  flip = false,
}: {
  x: number;
  y: number;
  z: number;
  flip?: boolean;
}) {
  const [cx, cy] = iso(x, y, z);
  const dir = flip ? -1 : 1;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Mount bracket */}
      <line x1={0} y1={-6} x2={0} y2={0} stroke="#0a3934" strokeWidth="2.2" strokeLinecap="round" />
      {/* Angled camera body */}
      <path
        d={`M ${-6 * dir} -3 L ${7 * dir} 1 L ${5 * dir} 7 L ${-7 * dir} 3 Z`}
        fill="#0a3934"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Lens */}
      <circle cx={6 * dir} cy={4} r="2.2" fill="#5eead4" />
    </g>
  );
}

export function HeroIsometricHome() {
  // Actor anchor point on the living room rug (foot position at fall spot)
  const [actorX, actorY] = iso(3.45, 7.25, 0.05);

  return (
    <div className="rumi-iso-stage relative mx-auto w-full max-w-[640px] select-none">
      {/* Floating Rumi Fall Alert Card (pops in after fall detection) */}
      <div
        role="status"
        aria-live="off"
        className="rumi-story-alert absolute right-0 top-2 z-20 rounded-2xl border border-[#f2c6c3] bg-white/95 px-4 py-3 shadow-[0_16px_40px_-18px_#0a393445] backdrop-blur-sm sm:right-2 sm:top-4"
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full bg-[#d43d37]" />
          <span className="font-display text-xs font-bold text-[#0a3934]">Rumi</span>
          <span className="rounded-full bg-[#fde8e8] px-2 py-0.5 text-[11px] font-bold text-[#b91c1c]">
            Fall Alert
          </span>
        </div>
        <p className="mt-1 text-sm font-bold text-[#0a3934]">Ruang keluarga, Kamera 01</p>
      </div>

      <svg
        viewBox="45 14 550 388"
        className="h-auto w-full"
        role="img"
        aria-label="Animasi ilustrasi isometrik rumah Rumi yang mendeteksi seseorang berjalan lalu terjatuh di ruang keluarga dan memicu notifikasi Fall Alert"
      >
        <defs>
          <linearGradient id="iso-cone-teal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d7166" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#0d7166" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="iso-cone-alert" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d43d37" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d43d37" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="iso-cone-quiet" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#0d7166" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0d7166" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <polygon
          points={pts([
            [0, 0, -0.36],
            [10, 0, -0.36],
            [10, 10, -0.36],
            [0, 10, -0.36],
          ])}
          fill="#0d7166"
          fillOpacity="0.07"
        />

        {/* Floor slab thickness */}
        <polygon
          points={pts([
            [0, 10, 0],
            [10, 10, 0],
            [10, 10, -0.34],
            [0, 10, -0.34],
          ])}
          fill="#0a3934"
        />
        <polygon
          points={pts([
            [10, 0, 0],
            [10, 10, 0],
            [10, 10, -0.34],
            [10, 0, -0.34],
          ])}
          fill="#062824"
        />

        {/* Main open-plan floor */}
        <polygon
          points={pts([
            [0, 0, 0],
            [10, 0, 0],
            [10, 10, 0],
            [0, 10, 0],
          ])}
          fill="#f2faf6"
          stroke="#0a3934"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Subtle floor zone lines (open-plan loft feel) */}
        <line
          x1={iso(5.4, 0, 0)[0]}
          y1={iso(5.4, 0, 0)[1]}
          x2={iso(5.4, 5.4, 0)[0]}
          y2={iso(5.4, 5.4, 0)[1]}
          stroke="#cce4dc"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Back-left exterior wall */}
        <polygon
          points={pts([
            [0, 0, 0],
            [0, 10, 0],
            [0, 10, 4],
            [0, 0, 4],
          ])}
          fill="#e7f6f0"
          stroke="#0a3934"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Back-right exterior wall */}
        <polygon
          points={pts([
            [0, 0, 0],
            [10, 0, 0],
            [10, 0, 4],
            [0, 0, 4],
          ])}
          fill="#daf0e8"
          stroke="#0a3934"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cutaway bold outer wall rim */}
        <polyline
          points={pts([
            [0, 10, 0],
            [0, 10, 4],
            [0, 0, 4],
            [10, 0, 4],
            [10, 0, 0],
          ])}
          fill="none"
          stroke="#0a3934"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Twin living room windows on back-left wall */}
        <g stroke="#0d7166" strokeWidth="1.2">
          <polygon
            points={pts([
              [0, 6.0, 1.2],
              [0, 8.9, 1.2],
              [0, 8.9, 3.25],
              [0, 6.0, 3.25],
            ])}
            fill="#ffffff"
          />
          <line
            x1={iso(0, 7.45, 1.2)[0]}
            y1={iso(0, 7.45, 1.2)[1]}
            x2={iso(0, 7.45, 3.25)[0]}
            y2={iso(0, 7.45, 3.25)[1]}
          />
          {/* Bedroom window on back-left wall */}
          <polygon
            points={pts([
              [0, 1.7, 1.5],
              [0, 3.9, 1.5],
              [0, 3.9, 3.25],
              [0, 1.7, 3.25],
            ])}
            fill="#ffffff"
          />
          {/* Rear window on back-right wall */}
          <polygon
            points={pts([
              [1.6, 0, 1.6],
              [3.8, 0, 1.6],
              [3.8, 0, 3.2],
              [1.6, 0, 3.2],
            ])}
            fill="#ffffff"
          />
        </g>

        {/* === BEDROOM (back-center, open-plan) === */}
        {/* Headboard */}
        <IsoBox
          x={1.5}
          y={0.35}
          w={2.7}
          d={0.28}
          h={1.35}
          topFill="#bfe2d6"
          leftFill="#96c9b8"
          rightFill="#7ab8a4"
        />
        {/* Bed base & mattress */}
        <IsoBox
          x={1.5}
          y={0.63}
          w={2.7}
          d={3.0}
          h={0.58}
          topFill="#ffffff"
          leftFill="#d4ece3"
          rightFill="#b8ddd0"
        />
        {/* Folded duvet */}
        <IsoBox
          x={1.5}
          y={1.65}
          z={0.58}
          w={2.7}
          d={1.98}
          h={0.14}
          topFill="#cde9df"
          leftFill="#a4d3c3"
          rightFill="#87bfa9"
          strokeWidth={1.05}
        />
        {/* Two pillows */}
        <IsoBox x={1.72} y={0.78} z={0.58} w={1.05} d={0.65} h={0.22} topFill="#ffffff" />
        <IsoBox x={2.92} y={0.78} z={0.58} w={1.05} d={0.65} h={0.22} topFill="#ffffff" />
        {/* Nightstand + bedside lamp */}
        <IsoBox x={4.4} y={0.45} w={0.78} d={0.78} h={0.68} topFill="#eaf6f1" />
        <line
          x1={iso(4.78, 0.84, 0.68)[0]}
          y1={iso(4.78, 0.84, 0.68)[1]}
          x2={iso(4.78, 0.84, 1.05)[0]}
          y2={iso(4.78, 0.84, 1.05)[1]}
          stroke="#0a3934"
          strokeWidth="1.6"
        />
        <ellipse
          cx={iso(4.78, 0.84, 1.15)[0]}
          cy={iso(4.78, 0.84, 1.15)[1]}
          rx="8"
          ry="5"
          fill="#ffffff"
          stroke="#0a3934"
          strokeWidth="1.3"
        />

        {/* === KITCHEN (right side) === */}
        {/* Tall Refrigerator */}
        <IsoBox
          x={5.8}
          y={0.35}
          w={1.15}
          d={1.15}
          h={2.35}
          topFill="#ffffff"
          leftFill="#d8eee6"
          rightFill="#b4dccf"
        />
        {/* Fridge door split line */}
        <line
          x1={iso(5.8, 1.5, 1.55)[0]}
          y1={iso(5.8, 1.5, 1.55)[1]}
          x2={iso(6.95, 1.5, 1.55)[0]}
          y2={iso(6.95, 1.5, 1.55)[1]}
          stroke="#0a3934"
          strokeWidth="1.1"
        />

        {/* Main kitchen counter along back-right wall */}
        <IsoBox
          x={7.0}
          y={0.35}
          w={2.7}
          d={1.1}
          h={1.2}
          topFill="#ffffff"
          leftFill="#d4ece3"
          rightFill="#b3dacd"
        />
        {/* Recessed Sink basin */}
        <polygon
          points={pts([
            [7.35, 0.55, 1.21],
            [8.15, 0.55, 1.21],
            [8.15, 1.2, 1.21],
            [7.35, 1.2, 1.21],
          ])}
          fill="#d9efe7"
          stroke="#0a3934"
          strokeWidth="1"
        />
        {/* Side counter with 4-burner stovetop */}
        <IsoBox
          x={8.6}
          y={1.45}
          w={1.1}
          d={3.45}
          h={1.2}
          topFill="#ffffff"
          leftFill="#d4ece3"
          rightFill="#b3dacd"
        />
        {/* Stovetop 4 burners */}
        {(
          [
            [8.95, 2.35],
            [9.35, 2.35],
            [8.95, 2.95],
            [9.35, 2.95],
          ] as const
        ).map(([bx, by], i) => {
          const [cx, cy] = iso(bx, by, 1.22);
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx="4.2"
              ry="2.2"
              fill="none"
              stroke="#0a3934"
              strokeWidth="1.1"
            />
          );
        })}
        {/* Upper wall cabinets */}
        <IsoBox
          x={7.05}
          y={0.25}
          z={2.25}
          w={2.6}
          d={0.62}
          h={1.05}
          topFill="#eaf6f1"
          leftFill="#cde7de"
          rightFill="#a9d4c6"
        />
        <line
          x1={iso(8.35, 0.87, 2.25)[0]}
          y1={iso(8.35, 0.87, 2.25)[1]}
          x2={iso(8.35, 0.87, 3.3)[0]}
          y2={iso(8.35, 0.87, 3.3)[1]}
          stroke="#0a3934"
          strokeWidth="1"
        />
        {/* Kitchen island */}
        <IsoBox
          x={6.1}
          y={3.25}
          w={1.45}
          d={2.4}
          h={1.05}
          topFill="#ffffff"
          leftFill="#d8eee6"
          rightFill="#b9dfd2"
        />

        {/* === LIVING ROOM (front-left) === */}
        {/* Crisp white area rug */}
        <polygon
          points={pts([
            [1.65, 5.35, 0.02],
            [5.15, 5.35, 0.02],
            [5.15, 8.95, 0.02],
            [1.65, 8.95, 0.02],
          ])}
          fill="#ffffff"
          stroke="#9bc8b9"
          strokeWidth="1.2"
        />

        {/* Standing Floor Lamp beside sofa */}
        <g>
          <ellipse
            cx={iso(0.85, 5.05, 0.04)[0]}
            cy={iso(0.85, 5.05, 0.04)[1]}
            rx="7"
            ry="3.8"
            fill="#bfe2d6"
            stroke="#0a3934"
            strokeWidth="1.1"
          />
          <line
            x1={iso(0.85, 5.05, 0.05)[0]}
            y1={iso(0.85, 5.05, 0.05)[1]}
            x2={iso(0.85, 5.05, 2.1)[0]}
            y2={iso(0.85, 5.05, 2.1)[1]}
            stroke="#0a3934"
            strokeWidth="1.7"
          />
          <ellipse
            cx={iso(0.85, 5.05, 2.2)[0]}
            cy={iso(0.85, 5.05, 2.2)[1]}
            rx="10"
            ry="5.5"
            fill="#ffffff"
            stroke="#0a3934"
            strokeWidth="1.3"
          />
        </g>

        {/* Detailed 3-Cushion Sofa */}
        <IsoBox
          x={0.5}
          y={5.75}
          w={1.15}
          d={3.15}
          h={0.56}
          topFill="#d8eee6"
          leftFill="#b7dcd0"
          rightFill="#96c9b8"
        />
        {/* Sofa backrest */}
        <IsoBox
          x={0.45}
          y={5.75}
          z={0.56}
          w={0.34}
          d={3.15}
          h={0.62}
          topFill="#bfe2d6"
          leftFill="#96c9b8"
          rightFill="#7ab8a4"
        />
        {/* Sofa armrests */}
        <IsoBox x={0.48} y={5.7} z={0.56} w={1.15} d={0.28} h={0.35} topFill="#cde7de" />
        <IsoBox x={0.48} y={8.65} z={0.56} w={1.15} d={0.28} h={0.35} topFill="#cde7de" />
        {/* Cushion seams */}
        {[6.8, 7.8].map((sy) => (
          <line
            key={sy}
            x1={iso(0.8, sy, 0.57)[0]}
            y1={iso(0.8, sy, 0.57)[1]}
            x2={iso(1.64, sy, 0.57)[0]}
            y2={iso(1.64, sy, 0.57)[1]}
            stroke="#0a3934"
            strokeWidth="1"
          />
        ))}

        {/* === ANIMATED STORYTELLING FIGURE (Walk -> Fall -> Pose Lock) === */}
        <g transform={`translate(${actorX}, ${actorY})`}>
          <g className="rumi-story-actor">
            {/* Pose-tracking corner brackets around figure */}
            <g className="rumi-story-brackets" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M -20 -58 v -10 h 10" />
              <path d="M 20 -58 v -10 h -10" />
              <path d="M -20 -4 v 10 h 10" />
              <path d="M 20 -4 v 10 h -10" />
            </g>

            {/* Body pivots around feet (0, 0) when falling */}
            <g className="rumi-story-body">
              {/* Shadow under feet */}
              <ellipse cx="0" cy="2" rx="12" ry="5" fill="#0a3934" fillOpacity="0.16" />
              {/* Left & Right legs with subtle walking stride */}
              <line
                className="rumi-story-leg-a"
                x1="-4"
                y1="-24"
                x2="-6"
                y2="0"
                stroke="#0a3934"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <line
                className="rumi-story-leg-b"
                x1="4"
                y1="-24"
                x2="6"
                y2="0"
                stroke="#0a3934"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Torso */}
              <rect x="-8" y="-48" width="16" height="26" rx="7" fill="#0a3934" />
              {/* Arms */}
              <line
                x1="-7"
                y1="-44"
                x2="-14"
                y2="-27"
                stroke="#0a3934"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <line
                x1="7"
                y1="-44"
                x2="14"
                y2="-27"
                stroke="#0a3934"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Head */}
              <circle cx="0" cy="-56" r="7.5" fill="#0a3934" />

              {/* Pose keypoint skeleton overlay */}
              <g className="rumi-story-skeleton" strokeWidth="1.5" strokeLinecap="round">
                <line x1="-6" y1="-44" x2="6" y2="-44" />
                <line x1="-6" y1="-44" x2="-4" y2="-24" />
                <line x1="6" y1="-44" x2="4" y2="-24" />
                <line x1="-4" y1="-24" x2="-6" y2="-2" />
                <line x1="4" y1="-24" x2="6" y2="-2" />
                {[
                  [0, -56],
                  [-6, -44],
                  [6, -44],
                  [-4, -24],
                  [4, -24],
                  [-6, -2],
                  [6, -2],
                ].map(([kx, ky], i) => (
                  <circle
                    key={i}
                    cx={kx}
                    cy={ky}
                    r="2"
                    fill="#ffffff"
                    stroke="currentColor"
                    strokeWidth="1.1"
                  />
                ))}
              </g>
            </g>
          </g>
        </g>

        {/* === CAMERA VISION CONES === */}
        {/* Quiet bedroom & kitchen cones */}
        <polygon
          points={pts([
            [0.3, 0.3, 3.65],
            [1.3, 4.1, 0.2],
            [4.5, 3.9, 0.2],
            [4.4, 0.8, 0.2],
          ])}
          fill="url(#iso-cone-quiet)"
        />
        <polygon
          points={pts([
            [9.6, 0.3, 3.65],
            [5.8, 1.6, 0.2],
            [6.0, 5.2, 0.2],
            [9.1, 4.8, 0.2],
          ])}
          fill="url(#iso-cone-quiet)"
        />

        {/* Living room camera cone: teal normally, subtle red overlay on fall */}
        <polygon
          points={pts([
            [0.2, 9.5, 3.65],
            [1.5, 5.1, 0.2],
            [5.1, 6.1, 0.2],
            [3.4, 9.2, 0.2],
          ])}
          fill="url(#iso-cone-teal)"
        />
        <polygon
          points={pts([
            [0.2, 9.5, 3.65],
            [1.5, 5.1, 0.2],
            [5.1, 6.1, 0.2],
            [3.4, 9.2, 0.2],
          ])}
          fill="url(#iso-cone-alert)"
          className="rumi-story-cone-alert"
        />

        {/* === CEILING WEDGE CCTV CAMERAS === */}
        <CeilingCamera x={0.2} y={9.5} z={3.68} />
        <CeilingCamera x={0.3} y={0.3} z={3.68} />
        <CeilingCamera x={9.6} y={0.3} z={3.68} flip />
      </svg>
    </div>
  );
}
