'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, Brain, TrendingUp, BarChart3, Zap, Shield, Globe } from 'lucide-react';

export default function SynapseAILanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Trigger animations on load
    setTimeout(() => setIsVisible(true), 100);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent'}`}>
        <nav className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo - Far Left */}
            <Link href="/" className={`flex items-center space-x-2 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-normal text-white">SynapseAI</span>
            </Link>

            {/* Desktop Navigation - Far Right */}
            <div className={`hidden md:flex items-center space-x-8 transition-all duration-700 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
              <Link href="/services" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm font-normal">Services</Link>
              <Link href="/solutions" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm font-normal">Solutions</Link>
              <Link href="/about" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm font-normal">About</Link>
              <Link href="/demo" className="px-5 py-2 bg-white text-black rounded-full text-sm font-normal hover:bg-gray-100 transition-all duration-300 hover:scale-105">
                Book a demo
              </Link>
            </div>

            {/* Mobile menu toggle - Far Right */}
            <button
              className="md:hidden text-white z-50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className={`md:hidden fixed inset-0 bg-black/95 backdrop-blur-lg transition-all duration-500 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            <div className="flex flex-col items-center justify-center h-full space-y-8">
              <Link href="/services" className="text-xl text-gray-300 hover:text-white transition-colors font-normal" onClick={() => setIsMenuOpen(false)}>Services</Link>
              <Link href="/solutions" className="text-xl text-gray-300 hover:text-white transition-colors font-normal" onClick={() => setIsMenuOpen(false)}>Solutions</Link>
              <Link href="/about" className="text-xl text-gray-300 hover:text-white transition-colors font-normal" onClick={() => setIsMenuOpen(false)}>About</Link>
              <Link href="/demo" className="px-8 py-3 bg-white text-black rounded-full font-normal hover:bg-gray-100 transition-all duration-300">
                Book a demo
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Y Combinator Badge */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
        <div className={`inline-flex items-center px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 backdrop-blur-sm transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center mr-2">
            <span className="text-xs font-bold text-white">Y</span>
          </div>
          <span className="text-sm text-orange-400 font-medium">Backed by Y Combinator</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-3xl md:text-5xl lg:text-6xl font-normal mb-8 transition-all duration-1000 delay-500 leading-tight ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            AI-Powered Financial Intelligence for{' '}.  
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Retail Excellence
            </span>
          </h1>
          
          <p className={`text-base md:text-lg text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-normal transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            Transform retail guesswork into data-driven profits. Our proprietary AI models predict demand, optimize inventory, and increase margins by 25% while keeping your data secure and private.
          </p>
          
          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <Link href="/demo" className="group px-7 py-3 bg-white text-black rounded-full font-normal hover:bg-gray-100 transition-all duration-300 flex items-center justify-center hover:scale-105 hover:shadow-lg text-sm">
              Book a demo
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link href="/about" className="px-7 py-3 border border-gray-600 text-white rounded-full font-normal hover:border-white hover:bg-white/5 transition-all duration-300 hover:scale-105 text-sm">
              Learn more →
            </Link>
          </div>
        </div>

        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-600 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Key Services Section */}
      <section id="services" className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-normal text-white mb-4">
              Our AI-Powered Services
            </h2>
            <p className="text-base text-gray-400 max-w-2xl mx-auto font-normal">
              Complete retail intelligence solutions built on our proprietary AI platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Smart Demand Forecasting",
                description: "Predict customer demand with 92% accuracy using our advanced neural networks trained on retail patterns.",
                advantages: ["Reduce stockouts by 40%", "Cut excess inventory by 30%", "Improve cash flow by 25%"]
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Inventory Optimization",
                description: "AI-driven stock level optimization across all SKUs and locations with real-time adjustments.",
                advantages: ["Automated reorder points", "Seasonal planning", "Multi-location balancing"]
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Financial Planning & Analysis",
                description: "Comprehensive FP&A suite with AI-powered cash flow predictions and profitability analysis.",
                advantages: ["13-week cash forecasts", "Scenario planning", "Margin optimization"]
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Price Intelligence",
                description: "Dynamic pricing recommendations based on demand elasticity, competition, and market conditions.",
                advantages: ["Maximize profit margins", "Competitive positioning", "Market-responsive pricing"]
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "Multi-Channel Analytics",
                description: "Unified insights across online and offline channels with cross-platform optimization.",
                advantages: ["Channel performance", "Customer journey analysis", "Omnichannel planning"]
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Risk Management",
                description: "Predictive risk assessment for supply chain disruptions, market volatility, and operational challenges.",
                advantages: ["Early warning systems", "Contingency planning", "Risk mitigation strategies"]
              }
            ].map((service, index) => (
              <div 
                key={index} 
                className="group p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-black/60 border border-gray-800 hover:border-blue-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  {service.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-4">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed mb-6 text-sm font-normal">{service.description}</p>
                <div className="space-y-2">
                  {service.advantages.map((advantage, idx) => (
                    <div key={idx} className="flex items-center text-sm text-green-400">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                      {advantage}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solutions" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-normal text-white mb-4">
              The AI-Powered Solution
            </h2>
            <p className="text-base text-gray-400 max-w-2xl mx-auto font-normal">
              SynapseAI transforms retail operations with proprietary machine learning models
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-8 h-8" />,
                title: "92% Demand Accuracy",
                description: "Predict customer demand with our proprietary neural networks analyzing 50+ data points including seasonality, weather, and market trends."
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "30% Inventory Reduction",
                description: "Optimize stock levels automatically with our advanced algorithms. Reduce overstock waste while preventing stockouts."
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "25% Profit Increase",
                description: "Our AI-driven insights help improve margins through better pricing, buying, and operational decisions."
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Real-time Cash Flow",
                description: "Predict cash needs 13 weeks ahead with our proprietary forecasting models. Prevent working capital crises."
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "Multi-Channel Intelligence",
                description: "Unified view across online and offline channels. Our AI optimizes inventory for each location automatically."
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "40+ Hours Saved",
                description: "Automate manual planning processes with our intelligent automation. Focus on strategy instead of spreadsheets."
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="group p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 hover:border-blue-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm font-normal">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-normal text-white mb-4">
              Get Started in 4 Weeks
            </h2>
            <p className="text-base text-gray-400 font-normal">
              From data chaos to AI-powered insights in just one month
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "1",
                title: "Data Integration",
                description: "Connect your POS, ERP, and e-commerce systems. We handle the heavy lifting."
              },
              {
                step: "2",
                title: "AI Training",
                description: "Gemini AI learns your business patterns, customer behavior, and market dynamics."
              },
              {
                step: "3",
                title: "Dashboard Setup",
                description: "Custom dashboards for executives, buyers, and store managers. Mobile-optimized."
              },
              {
                step: "4",
                title: "Go Live",
                description: "Start receiving AI-powered insights and recommendations. Continuous improvement included."
              }
            ].map((item, index) => (
              <div key={index} className="flex items-start space-x-6 group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg group-hover:scale-110 transition-transform duration-300">
                  {item.step}
                </div>
                <div className="group-hover:translate-x-2 transition-transform duration-300">
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed font-normal">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center">
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-normal mb-4 text-white">
                Ready to Transform Your Retail Business?
              </h2>
              <p className="text-base mb-8 text-white/90 max-w-2xl mx-auto font-normal">
                Join retailers increasing profits by 25% with AI-powered financial intelligence
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/demo" className="px-7 py-3 bg-white text-black rounded-full font-normal hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-lg text-sm">
                  Book a demo
                </Link>
                <Link href="/about" className="px-7 py-3 border-2 border-white text-white rounded-full font-normal hover:bg-white hover:text-black transition-all duration-300 hover:scale-105 text-sm">
                  Learn more →
                </Link>
              </div>
            </div>
            
            {/* Background animation */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">SynapseAI</span>
              </Link>
              <p className="text-gray-400 text-sm">
                AI-powered financial intelligence for retail excellence
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-3">Solutions</h3>
              <ul className="space-y-2">
                <li><Link href="/services/demand-forecasting" className="text-gray-400 hover:text-white text-sm transition-colors">Demand Forecasting</Link></li>
                <li><Link href="/services/inventory-optimization" className="text-gray-400 hover:text-white text-sm transition-colors">Inventory Optimization</Link></li>
                <li><Link href="/services/financial-planning" className="text-gray-400 hover:text-white text-sm transition-colors">Financial Planning</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-3">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="text-gray-400 hover:text-white text-sm transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-3">Contact</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>hello@synapseai.com</li>
                <li>Kigali, Rwanda</li>
                <li>+250 123 456 789</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2025 SynapseAI. All rights reserved. Built with ❤️ in Rwanda</p>
          </div>
        </div>
      </footer>
    </div>
  );
}