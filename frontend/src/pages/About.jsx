import { motion } from 'motion/react';
import { Sparkles, Heart, ShieldCheck, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TiltCard from '../components/TiltCard';

export default function About() {
  const { t } = useTranslation();

  const values = [
    { icon: Sparkles, title: t('about.value1Title'), body: t('about.value1Body') },
    { icon: Heart, title: t('about.value2Title'), body: t('about.value2Body') },
    { icon: ShieldCheck, title: t('about.value3Title'), body: t('about.value3Body') },
    { icon: Rocket, title: t('about.value4Title'), body: t('about.value4Body') },
  ];

  return (
    <div>
      <section className="bg-ink py-20 text-center text-white">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl px-6">
          <span className="pill bg-white/10 text-white/80">{t('about.tag')}</span>
          <h1 className="mt-5 font-display text-3xl font-semibold sm:text-5xl">
            {t('about.title')}
          </h1>
          <p className="mt-5 text-white/70">
            {t('about.body')}
          </p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <TiltCard intensity={7} className="card h-full p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-ink/60">{body}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card grid gap-8 p-8 sm:grid-cols-3 sm:text-center"
        >
          {[
            { stat: '500+', label: t('about.stat1Label') },
            { stat: '120K+', label: t('about.stat2Label') },
            { stat: '4.8/5', label: t('about.stat3Label') },
          ].map(({ stat, label }) => (
            <div key={label}>
              <p className="font-display text-3xl font-semibold text-transparent bg-vibe-gradient bg-clip-text">{stat}</p>
              <p className="mt-1 text-sm text-ink/60">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
