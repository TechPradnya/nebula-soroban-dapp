import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, Coins } from 'lucide-react';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import OrbitVisual from '../components/ui/OrbitVisual.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Escrow, not promises',
    body: 'Payment locks into a Soroban contract the moment a task is posted. No client can ghost, no freelancer works on credit.',
  },
  {
    icon: Zap,
    title: 'Settled in seconds',
    body: 'Approval releases funds instantly on Stellar — no invoicing cycle, no waiting on a payment processor.',
  },
  {
    icon: Coins,
    title: 'Fees that come back to you',
    body: 'Every completed task feeds the staking pool. Stake once, earn a share of platform fees for as long as you hold.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar onMenuClick={() => {}} />

      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24" id="main-content">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="pill mb-6 text-cyan">Live on Stellar Testnet</span>
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Freelance work,
            <br />
            settled <span className="bg-gradient-to-r from-indigo-soft to-cyan bg-clip-text text-transparent">on-chain</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-mist-dim">
            Post a task, escrow the payment in a Soroban smart contract, and release it the moment work is
            approved. Platform fees don&rsquo;t disappear — they flow straight into the staking pool.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/marketplace" className="btn-primary">
              Browse tasks <ArrowRight size={16} />
            </Link>
            <Link to="/register" className="btn-secondary">
              Create an account
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex justify-center"
        >
          <OrbitVisual />
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <GlassCard
              key={f.title}
              className="p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <f.icon className="mb-4 text-cyan" size={24} />
              <h3 className="mb-2 font-display font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-mist-dim">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
