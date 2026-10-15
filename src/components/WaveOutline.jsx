/** The SVG drawn by useWaveTabs: the filled raised tab plus its outline. */
export default function WaveOutline({ wave, fill, fillClassName, fillStyle, stroke, strokeClassName }) {
  if (!wave.geo) return null;
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      viewBox={`0 0 ${wave.geo.width} ${wave.geo.height}`}
      preserveAspectRatio="none"
    >
      {/* d is written per frame by useWaveTabs */}
      <path
        ref={wave.fillRef}
        fill={fill}
        className={fillClassName}
        style={fillStyle}
        shapeRendering="geometricPrecision"
      />
      <path
        ref={wave.strokeRef}
        fill="none"
        stroke={stroke}
        className={strokeClassName}
        strokeWidth="1"
        shapeRendering="geometricPrecision"
      />
    </svg>
  );
}
