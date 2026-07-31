import { motion } from 'framer-motion';

/**
 * The base surface used everywhere: dashboard tiles, task cards, modals.
 * `hover` adds the subtle lift/brighten interaction; `as` lets callers
 * render it as a button or link when the whole card is clickable.
 */
export default function GlassCard({ children, className = '', hover = false, as: Tag = 'div', ...rest }) {
  // motion.div/motion.button etc. only work for string tag names; for a
  // component reference (e.g. react-router's Link) framer-motion needs
  // motion(Component) instead of a bracket lookup.
  const wrapCustom = motion.create || motion;
  const MotionTag = typeof Tag === 'string' ? motion[Tag] || motion.div : wrapCustom(Tag);
  return (
    <MotionTag
      className={`glass-panel ${hover ? 'glass-panel-hover cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
