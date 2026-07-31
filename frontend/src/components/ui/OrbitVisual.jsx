import { motion, useReducedMotion } from 'framer-motion';

/**
 * The visual thesis of Nebula: small nodes (completed tasks) travel along
 * an orbit and feed into a central ring (the staking pool), mirroring the
 * actual Marketplace -> Staking cross-contract call. Not decoration —
 * this is literally how the product moves money.
 */
export default function OrbitVisual({ size = 380 }) {
  const nodes = [0, 1, 2, 3, 4];
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 rounded-full bg-orbit-ring opacity-20 blur-2xl ${
          reduceMotion ? '' : 'animate-spin-slower'
        }`}
      />

      <div className="absolute inset-6 rounded-full border border-white/10" />
      <div className="absolute inset-16 rounded-full border border-white/[0.06]" />

      {nodes.map((i) => {
        const duration = 10 + i * 2;
        const delay = i * 0.6;
        const radius = size / 2 - 24 - i * 6;
        return (
          <motion.div
            key={i}
            className="absolute h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.8)]"
            style={
              reduceMotion
                ? { left: '50%', top: `${50 - (radius / size) * 100}%` }
                : { left: '50%', top: '50%' }
            }
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [radius, 0, -radius, 0, radius],
                    y: [0, radius, 0, -radius, 0],
                  }
            }
            transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
          />
        );
      })}

      <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/10 bg-surface/80 text-center backdrop-blur-glass">
        <span className="font-display text-xl font-bold text-white">10%</span>
        <span className="text-[10px] uppercase tracking-wide text-mist-dim">fee → stakers</span>
      </div>
    </div>
  );
}
