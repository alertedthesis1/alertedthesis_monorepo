import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Shield, Bell, PieChart, FileText, ArrowRight, Check, ShieldAlert, ArrowDown } from 'lucide-react';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>AlertED — Early Warning and Prevention System for Students at Risk</title>
        <meta name="description" content="AI-powered early warning system for student success" />
      </Head>

      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* HEADER / NAVBAR */}
        <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="#hero" className="flex items-center space-x-3 group">
              <img src="/images/alerted-logo.png" alt="AlertED Logo" className="h-10 w-auto group-hover:scale-105 transition-transform" />
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">AlertED</span>
                <span className="text-xs font-medium text-slate-500 block hidden sm:block">St. Joseph College – Olongapo Inc.</span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-green-800 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-green-800 transition-colors">How It Works</a>
              <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-green-800 transition-colors">About System</a>
            </nav>

            {/* Login CTA Button */}
            <div className="flex items-center space-x-3">
              <Link href="/login" className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-green-800 hover:bg-green-900 transition-all duration-200 shadow-sm hover:shadow-md focus:ring-2 focus:ring-green-700 focus:ring-offset-2">
                <ArrowRight size={16} className="mr-2" />
                Login Portal
              </Link>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section id="hero" className="relative bg-green-900 text-white py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-green-900/60 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            
            {/* Emblem / Icon Badge */}
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-6 border border-white/20 shadow-lg">
              <img src="/images/alerted-logo.png" alt="AlertED Logo" className="h-32 w-auto" />
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight mb-6">
              AlertED: Early Warning and Prevention System for Students at Risk
            </h1>
            <p className="text-lg sm:text-xl text-green-100 max-w-3xl mx-auto font-normal leading-relaxed mb-10">
              Empowering guidance counselors and Junior High School faculty at <span className="text-white font-semibold underline decoration-green-200 decoration-2 underline-offset-4">St. Joseph College – Olongapo Inc.</span> with machine learning-driven risk detection and early intervention workflows.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-green-900 bg-amber-400 hover:bg-amber-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center">
                <ShieldAlert size={20} className="mr-2.5" />
                Go to Educator Portal
              </Link>
              <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-white bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                Explore System Features
                <ArrowDown size={16} className="ml-2.5" />
              </a>
            </div>

            {/* Key Metrics Pill */}
            <div className="mt-14 inline-grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-sm text-left max-w-4xl mx-auto border border-white/15">
              <div className="border-r border-white/10 pr-4">
                <p className="text-2xl font-bold text-amber-300">4.25 / 5.0</p>
                <p className="text-xs text-green-100 font-medium">TAM Grand Mean</p>
              </div>
              <div className="border-r border-white/10 pr-4">
                <p className="text-2xl font-bold text-emerald-300">100%</p>
                <p className="text-xs text-green-100 font-medium">UAT Pass Rate</p>
              </div>
              <div className="border-r border-white/10 pr-4">
                <p className="text-2xl font-bold text-white">70.0 / 100</p>
                <p className="text-xs text-green-100 font-medium">SUS Usability Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-300">Real-Time</p>
                <p className="text-xs text-green-100 font-medium">Absence Alerts</p>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-green-800 bg-green-50 px-3 py-1 rounded-full border border-green-200 mb-3">Core Capabilities</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Everything Your Educators Need</h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600">Built to replace reactive manual monitoring with proactive, data-informed student retention insights.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-green-600 hover:shadow-lg transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-green-100 text-green-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Bell size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Real-Time Risk Tracking & Alerts</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Automatic notifications triggered by consecutive absences, sudden grade changes, or logged behavioral flags allow counselors to step in before disengagement escalates.
                </p>
                <ul className="text-xs space-y-2 text-slate-700 font-medium">
                  <li className="flex items-center"><Check size={14} className="text-green-600 mr-2" /> Color-coded risk levels (Low, Moderate, High)</li>
                  <li className="flex items-center"><Check size={14} className="text-green-600 mr-2" /> Instant absence alert notifications</li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-green-600 hover:shadow-lg transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-green-100 text-green-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <PieChart size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">ML-Driven Risk Scores</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Machine learning classification model built on student attendance logs, core academic scores (English, Math, Science), and classroom conduct metrics.
                </p>
                <ul className="text-xs space-y-2 text-slate-700 font-medium">
                  <li className="flex items-center"><Check size={14} className="text-green-600 mr-2" /> Multidimensional predictive data ingestion</li>
                  <li className="flex items-center"><Check size={14} className="text-green-600 mr-2" /> Objective early warning indicators</li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-green-600 hover:shadow-lg transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-green-100 text-green-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Intervention Logging & Reports</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Enables counselors and class advisers to record parent conferences, counseling sessions, and academic remediation with exportable PDF/Excel summaries.
                </p>
                <ul className="text-xs space-y-2 text-slate-700 font-medium">
                  <li className="flex items-center"><Check size={14} className="text-green-600 mr-2" /> Guidance workflow integration</li>
                  <li className="flex items-center"><Check size={14} className="text-green-600 mr-2" /> One-click institutional reporting</li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* INSTITUTIONAL HIGHLIGHT SECTION */}
        <section id="about" className="py-20 bg-green-50 border-y border-green-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Left Mock Graphic */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-semibold text-slate-400 pl-2">AlertED Live Monitor — Grade 8 - St. Jude</span>
                  </div>
                  <span className="text-xs font-bold text-green-800 bg-green-100 px-2.5 py-1 rounded-full">S.Y. 2025–2026</span>
                </div>

                {/* Student At-Risk Preview Row */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">High</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Student #2026-0814</p>
                        <p className="text-xs text-slate-500">3 Consecutive Absences • Math Score: 72%</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">High Risk (84.2%)</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">Mod</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Student #2026-0921</p>
                        <p className="text-xs text-slate-500">Behavioral Flagged • Science Score: 78%</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Moderate (54.0%)</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">Low</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Student #2026-0105</p>
                        <p className="text-xs text-slate-500">Attendance 98% • English Score: 89%</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Low Risk (12.1%)</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span><Shield size={12} className="text-green-700 mr-1.5 inline" /> Protected under RA 10173 Data Privacy</span>
                  <span className="font-semibold text-green-800">St. Joseph College Guidance Office</span>
                </div>
              </div>

              {/* Right Text Content */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-green-800 bg-white px-3 py-1 rounded-full border border-green-200">Contextualized for Local Needs</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3 mb-6">
                  Built specifically for St. Joseph College Junior High School
                </h2>
                <p className="text-slate-600 text-base leading-relaxed mb-6">
                  Traditional monitoring detects student disengagement only after academic grades drop sharply. <strong>AlertED</strong> bridges this gap by offering early behavioral warning signals, empowering counselors and advisers to step in when intervention can make a lasting difference.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs mt-1 mr-3 flex-shrink-0">
                      <Check size={12} />
                    </div>
                    <p className="text-sm text-slate-700"><strong className="text-slate-900">Human-in-the-Loop Decision Support:</strong> Machine learning scores augment—rather than replace—educators' professional judgment.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs mt-1 mr-3 flex-shrink-0">
                      <Check size={12} />
                    </div>
                    <p className="text-sm text-slate-700"><strong className="text-slate-900">Role-Based Portals:</strong> Custom views tailored for School Admins, Guidance Counselors, and Subject Faculty.</p>
                  </div>
                </div>

                <Link href="/login" className="inline-flex items-center px-6 py-3 rounded-xl bg-green-800 hover:bg-green-900 text-white font-bold text-sm shadow-md transition-all">
                  Access Educator Portal Now
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-green-800 bg-green-50 px-3 py-1 rounded-full border border-green-200 mb-3">Simple 3-Step Process</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">How AlertED Safeguards Students</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-green-800 text-white flex items-center justify-center mx-auto text-2xl font-bold mb-6 shadow-lg">1</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Ingest Student Data</h3>
                <p className="text-sm text-slate-600">Faculty record daily attendance, subject grades (English, Math, Science), and conduct metrics.</p>
              </div>
              {/* Step 2 */}
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto text-2xl font-bold mb-6 shadow-lg">2</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">ML Risk Processing</h3>
                <p className="text-sm text-slate-600">AlertED computes multidimensional risk scores and flags early patterns of potential dropout.</p>
              </div>
              {/* Step 3 */}
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto text-2xl font-bold mb-6 shadow-lg">3</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Targeted Intervention</h3>
                <p className="text-sm text-slate-600">Counselors review actionable risk alerts, conduct sessions, and track retention outcomes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-6">
            <div className="flex items-center space-x-3">
              <img src="/images/alerted-logo.png" alt="AlertED Logo" className="h-8 w-auto" />
              <span className="text-white font-bold tracking-tight">AlertED System</span>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} St. Joseph College – Olongapo Inc. — Proactive early warning for student retention.
            </p>
            <div className="flex items-center space-x-4 text-xs">
              <Link href="/login" className="hover:text-white transition-colors">Educator Portal</Link>
              <span>•</span>
              <a href="#hero" className="hover:text-white transition-colors">Back to Top</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
