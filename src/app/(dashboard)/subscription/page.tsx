"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useAnimation } from "framer-motion";
import { 
  Menu, Play, X, ChevronRight, CheckCircle2, 
  MessageSquare, Star, MessageCircle, BarChart3, 
  Search, CalendarCheck, Megaphone, Bell
} from "lucide-react";
import styles from "./page.module.css";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    // Add any necessary effects here
  }, []);

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const actionCards = [
    {
      title: "Yeni Yorum Analizi",
      desc: "Diş Kliniği Marmaris ★★★★☆ — Olumlu",
      badge: "%87",
      icon: <Star color="#fbbf24" size={20} />
    },
    {
      title: "Rezervasyon Hatırlatma",
      desc: "Kafe Bodrum — Yarın 14:00 — 3 kişi",
      badge: "Onaylandı",
      icon: <CalendarCheck color="#34d399" size={20} />
    },
    {
      title: "Chatbot Yanıtı",
      desc: "Kuaför Alsancak — Randevu onaylandı",
      badge: "İletildi",
      icon: <MessageCircle color="#60a5fa" size={20} />
    },
    {
      title: "Rakip Analizi",
      desc: "12 yeni yorum bulundu",
      badge: "Güncel",
      icon: <Search color="#a78bfa" size={20} />
    },
    {
      title: "Mesaj",
      desc: "Yeni müşteri sorusu geldi",
      badge: "Yanıt Bekliyor",
      icon: <MessageSquare color="#f472b6" size={20} />
    },
    {
      title: "Performans Raporu",
      desc: "Haftalık ziyaretçi artışı",
      badge: "+24%",
      icon: <BarChart3 color="#a3e635" size={20} />
    }
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* Removed Navbar for Dashboard Integration */}

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.section}>
          <div className={styles.heroLayout} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '64px', alignItems: 'center' }}>
            
            <motion.div 
              className={styles.heroContent}
              initial="hidden"
              animate="visible"
              variants={fadeUpVariant}
            >
              <h1 className={styles.heroTitle}>İşletmenizi <br/>Yapay Zeka ile <br/>Yönetin</h1>
              <p className={styles.heroDesc}>
                Yorumları analiz edin, rezervasyonları otomatikleştirin ve müşteri iletişimini tek bir yapay zeka asistanıyla yönetin.
              </p>
              
              <div>
                <div className={styles.emailForm}>
                  <input type="email" placeholder="E-posta adresiniz" className={styles.emailInput} />
                  <button className={styles.ctaBtn}>Erken Erişim Al</button>
                </div>
                <div className={styles.ctaNote}>İlk 100 kayıt özel indirim kazanır.</div>
              </div>
            </motion.div>

            <motion.div 
              className={styles.cardsStackWrapper}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className={styles.stackStatus}>
                <CheckCircle2 color="#34d399" size={16} /> 
                Bugün 24 aksiyon tamamlandı
              </div>
              
              <div className={styles.cardList}>
                <motion.div
                  animate={{
                    y: ["0%", "-50%"]
                  }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 20
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                >
                  {/* Duplicate array for continuous scroll */}
                  {[...actionCards, ...actionCards].map((card, i) => (
                    <div key={i} className={styles.glassCard}>
                      <div className={styles.cardIcon}>{card.icon}</div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardTitle}>{card.title}</div>
                        <div className={styles.cardDesc}>{card.desc}</div>
                      </div>
                      <div className={styles.cardBadge}>{card.badge}</div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className={styles.marqueeSection}>
        <div className={styles.marqueeTitle}>Entegrasyonlar</div>
        <div className={styles.marqueeContainer}>
          <motion.div
            className={styles.marqueeTrack}
            animate={{
              x: ["0%", "-50%"]
            }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 25
            }}
          >
            {[1, 2].map((set) => (
              <React.Fragment key={set}>
                <div className={styles.marqueeLogo}>Google Maps</div>
                <div className={styles.marqueeLogo}>Google Reviews</div>
                <div className={styles.marqueeLogo}>Instagram</div>
                <div className={styles.marqueeLogo}>WhatsApp</div>
                <div className={styles.marqueeLogo}>Booking.com</div>
                <div className={styles.marqueeLogo}>TripAdvisor</div>
                <div className={styles.marqueeLogo}>Yandex Maps</div>
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className={styles.section} style={{ paddingTop: '160px', paddingBottom: '160px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariant}
        >
          <div className={styles.sectionLabel}>Sorun</div>
          <h2 className={styles.sectionTitle}>Harika hizmet vermek yetmiyor</h2>
          <p className={styles.sectionSubtitle}>
            İşletmelerin %72'si online itibar yönetiminde zorlanıyor.
          </p>
          
          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}><MessageSquare /></div>
              <h3 className={styles.problemCardTitle}>Yorumlar dağınık</h3>
              <p className={styles.problemCardDesc}>
                Google, TripAdvisor, Instagram... Her platformu ayrı ayrı takip etmek büyük bir zaman kaybı yaratır.
              </p>
            </div>
            
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}><Bell /></div>
              <h3 className={styles.problemCardTitle}>Müşteri iletişimi tutarsız</h3>
              <p className={styles.problemCardDesc}>
                Bir gün hızlı yanıt, ertesi gün sessizlik. Cevap alamayan müşteriler hızla kaybedilir.
              </p>
            </div>
            
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}><Search /></div>
              <h3 className={styles.problemCardTitle}>Rakiplerinizi takip edemiyorsunuz</h3>
              <p className={styles.problemCardDesc}>
                Ne yaptıkları, hangi yorumları aldıkları, neyi doğru yaptıkları karanlık bir kutu.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Solution Section */}
      <section className={styles.section} style={{ paddingTop: '80px', paddingBottom: '160px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariant}
        >
          <div className={styles.sectionLabel}>Çözüm</div>
          <h2 className={styles.sectionTitle}>NeuroHub — Yapay Zeka Destekli İşletme Asistanınız</h2>
          
          <div className={styles.solutionLayout}>
            
            {/* Step 1 */}
            <div className={styles.solutionStep}>
              <motion.div className={styles.stepContent} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariant}>
                <div className={styles.stepNumber}>1</div>
                <h3 className={styles.stepTitle}>NeuroHub yorumlarınızı toplar</h3>
                <p className={styles.stepDesc}>
                  Yalnızca tek bir defa hesaplarınızı bağlarsınız, gerisini NeuroHub'a bırakırsınız. Tüm mecralardaki etkileşimleri anında bir araya getiririz.
                </p>
              </motion.div>
              <motion.div className={styles.stepVisual} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className={styles.stepVisualInner}></div>
                <div className={styles.stepMockup}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', padding: 24 }}>
                    <div style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                    <div style={{ height: 32, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
                    <div style={{ height: 32, width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
                    <div style={{ height: 32, width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Step 2 */}
            <div className={styles.solutionStep}>
              <motion.div className={styles.stepVisual} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className={styles.stepVisualInner}></div>
                <div className={styles.stepMockup}>
                  <div style={{ width: 120, height: 120, borderRadius: '50%', border: '16px solid rgba(139, 92, 246, 0.4)', borderTopColor: '#8b5cf6' }} />
                </div>
              </motion.div>
              <motion.div className={styles.stepContent} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariant}>
                <div className={styles.stepNumber}>2</div>
                <h3 className={styles.stepTitle}>Yapay zeka analiz eder</h3>
                <p className={styles.stepDesc}>
                  Müşterinin niyeti, duygu durumu (olumlu/olumsuz), rekabet konumu ve eksiklikleri saniyeler içinde çözümlenir.
                </p>
              </motion.div>
            </div>

            {/* Step 3 */}
            <div className={styles.solutionStep}>
              <motion.div className={styles.stepContent} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariant}>
                <div className={styles.stepNumber}>3</div>
                <h3 className={styles.stepTitle}>Aksiyonlarınızı sunar</h3>
                <p className={styles.stepDesc}>
                  Hazırlanan yapay zeka taslakları ve aksiyon önerileri tek bir tıklama ile sizin onayınıza gelir.
                </p>
              </motion.div>
              <motion.div className={styles.stepVisual} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className={styles.stepVisualInner}></div>
                <div className={styles.stepMockup} style={{ background: '#0d0d10' }}>
                  <div style={{ display: 'flex', gap: 12, width: '100%', padding: 24, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, background: 'rgba(16, 185, 129, 0.2)', borderRadius: 20 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 10, width: '60%', background: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 8 }} />
                      <div style={{ height: 8, width: '40%', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                    </div>
                    <div style={{ height: 28, width: 60, background: '#8b5cf6', borderRadius: 6 }} />
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </motion.div>
      </section>

      {/* CTA Bottom Section */}
      <section className={styles.ctaBottom}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpVariant}
        >
          <h2 className={styles.ctaBottomTitle}>Yapay zeka asistanınızla <br/>tanışmaya hazır mısınız?</h2>
          <div className={styles.emailForm}>
            <input type="email" placeholder="E-posta adresiniz" className={styles.emailInput} />
            <button className={styles.ctaBtn}>Erken Erişim Al</button>
          </div>
          <div className={styles.ctaNote}>İlk 100 kayıt özel indirim kazanır.</div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.logo}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }} />
            NeuroHub
          </div>
          <span>NeuroHub işletmenizin sıkıcı işlerini halleder, siz işinize odaklanın.</span>
        </div>
        <div>
          <Link href="#" className={styles.footerLink}>Gizlilik Politikası</Link>
        </div>
      </footer>
    </div>
  );
}
