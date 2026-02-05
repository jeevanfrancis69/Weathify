import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="container nav-container">
          <div className="logo">
            <span className="logo-icon">🌤️</span>
            <span className="logo-text">Weathify</span>
          </div>
          <div className="nav-links">
            <Link to="/login" className="btn btn-secondary">Log In</Link>
            <Link to="/register" className="btn btn-primary">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="weather-icons">
            <span className="weather-icon float" style={{animationDelay: '0s'}}>☀️</span>
            <span className="weather-icon float" style={{animationDelay: '0.5s'}}>☁️</span>
            <span className="weather-icon float" style={{animationDelay: '1s'}}>🌧️</span>
            <span className="weather-icon float" style={{animationDelay: '1.5s'}}>❄️</span>
            <span className="weather-icon float" style={{animationDelay: '2s'}}>⚡</span>
          </div>
          
          <h1 className="hero-title fade-in-up">
            Music That Matches<br />
            <span className="gradient-text">Your Weather</span>
          </h1>
          
          <p className="hero-description fade-in-up" style={{animationDelay: '0.2s'}}>
            Weathify delivers contextual music recommendations based on<br />
            weather, time of day, and season. No black box AI, no hassle – just the<br />
            perfect soundtrack.
          </p>
          
          <div className="hero-actions fade-in-up" style={{animationDelay: '0.4s'}}>
            <Link to="/register" className="btn btn-primary btn-large">
              Start Listening →
            </Link>
            <Link to="/login" className="btn btn-secondary btn-large">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Why Weathify Section */}
      <section className="why-section">
        <div className="container">
          <h2 className="section-title text-center">
            Why <span className="gradient-text">Weathify</span>?
          </h2>
          <p className="section-subtitle text-center">
            Context-aware music discovery without the complexity.
          </p>
          
          <div className="features-grid">
            <div className="feature-card card">
              <div className="feature-icon">🌦️</div>
              <h3 className="feature-title">Weather-Aware</h3>
              <p className="feature-description">
                Automatically detects your local weather and matches the perfect soundtrack.
              </p>
            </div>
            
            <div className="feature-card card">
              <div className="feature-icon">🎵</div>
              <h3 className="feature-title">Curated Moods</h3>
              <p className="feature-description">
                Hand-picked playlists for every weather condition – rain, shine, or snow.
              </p>
            </div>
            
            <div className="feature-card card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Instant Match</h3>
              <p className="feature-description">
                Get personalized recommendations in seconds with our context engine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title text-center">
            How It <span className="gradient-text">Works</span>
          </h2>
          
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">01</div>
              <h3 className="step-title">Select Your Mood</h3>
              <p className="step-description">
                Share your location and let Weathify do the magic. If you're concerned about your privacy
                do not worry, you can input your own weather!
              </p>
            </div>
            
            <div className="step">
              <div className="step-number">02</div>
              <h3 className="step-title">Get Matched</h3>
              <p className="step-description">
                Our engine finds songs tagged for your specific context.
              </p>
            </div>
            
            <div className="step">
              <div className="step-number">03</div>
              <h3 className="step-title">Enjoy</h3>
              <p className="step-description">
                Listen to perfectly matched tracks instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">Ready to find your perfect soundtrack?</h2>
            <p className="cta-description">
              Join Weathify and discover music that fits your moment.
            </p>
            <Link to="/register" className="btn btn-primary btn-large">
              Get Started!
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <span className="logo-icon">🌤️</span>
              <span className="logo-text">Weathify</span>
            </div>
            <div className="footer-links">
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
          <p className="footer-copyright">© 2025 Weathify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
