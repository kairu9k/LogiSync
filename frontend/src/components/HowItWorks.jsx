import { useState, useEffect } from 'react'

export default function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const steps = [
    {
      number: 1,
      icon: '📋',
      title: 'Create Quote',
      description: 'Enter package details—weight, dimensions, and destination. Get instant pricing with our custom formula for standard or remote areas.',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#3b82f6'
    },
    {
      number: 2,
      icon: '🚛',
      title: 'Assign & Track',
      description: 'Convert quotes to orders, assign to drivers and vehicles. Monitor capacity in real-time and track GPS location every 20 seconds.',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#10b981'
    },
    {
      number: 3,
      icon: '📱',
      title: 'Driver Updates',
      description: 'Drivers use the mobile portal to update status on-the-go. Customers get real-time notifications from pickup to delivery.',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#f59e0b'
    }
  ]

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % steps.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Handle touch events for mobile swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && activeIndex < steps.length - 1) {
      setActiveIndex(activeIndex + 1)
    }
    if (isRightSwipe && activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
    }
    setTouchStart(0)
    setTouchEnd(0)
  }

  const goToSlide = (index) => {
    setActiveIndex(index)
  }

  return (
    <section className="section container" style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
      padding: '80px 20px',
      marginTop: '60px',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden'
    }}>
      <h2 className="section-title" style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        How LogiSync Works
      </h2>
      <p style={{
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto 48px',
        fontSize: '1.125rem',
        lineHeight: '1.8',
        color: '#cbd5e1'
      }}>
        Get your delivery operations running in three simple steps
      </p>

      {/* Carousel Container */}
      <div style={{ position: 'relative', maxWidth: '900px', margin: '0 auto' }}>
        {/* Cards Slider */}
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(-${activeIndex * 100}%)`,
            gap: '24px'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {steps.map((step, index) => {
            const isActive = index === activeIndex
            const isPrev = index === activeIndex - 1
            const isNext = index === activeIndex + 1

            return (
              <article
                key={index}
                className="card"
                style={{
                  minWidth: '100%',
                  textAlign: 'center',
                  padding: '50px 32px',
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(51, 65, 85, 0.5)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  border: isActive
                    ? `3px solid ${step.color}`
                    : `2px solid ${step.color}33`,
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'grab',
                  transform: isActive
                    ? 'scale(1)'
                    : isPrev || isNext
                      ? 'scale(0.85)'
                      : 'scale(0.7)',
                  opacity: isActive ? 1 : isPrev || isNext ? 0.6 : 0.3,
                  boxShadow: isActive
                    ? `0 24px 48px ${step.color}44`
                    : 'none'
                }}
              >
                {/* Step Number Badge */}
                <div style={{
                  width: '110px',
                  height: '110px',
                  margin: '0 auto 24px',
                  background: step.gradient,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: 'white',
                  fontWeight: '900',
                  boxShadow: isActive
                    ? `0 20px 40px ${step.color}66`
                    : `0 12px 24px ${step.color}44`,
                  position: 'relative',
                  transition: 'all 0.5s ease',
                  transform: isActive ? 'scale(1.1) rotate(0deg)' : 'scale(1) rotate(-5deg)'
                }}>
                  {/* Icon Badge */}
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: 'white',
                    borderRadius: '50%',
                    width: '46px',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    boxShadow: `0 8px 20px ${step.color}44`,
                    border: `3px solid ${step.color}`
                  }}>
                    {step.icon}
                  </span>
                  {step.number}
                </div>

                {/* Title */}
                <h3 style={{
                  marginBottom: '16px',
                  fontSize: isActive ? '1.75rem' : '1.5rem',
                  fontWeight: '800',
                  color: step.color,
                  transition: 'all 0.5s ease',
                  textShadow: isActive ? `0 0 30px ${step.color}66` : 'none'
                }}>
                  {step.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: isActive ? '1rem' : '0.95rem',
                  lineHeight: '1.7',
                  color: '#cbd5e1',
                  maxWidth: '550px',
                  margin: '0 auto',
                  transition: 'all 0.5s ease'
                }}>
                  {step.description}
                </p>

                {/* Animated Progress Bar */}
                {isActive && (
                  <div style={{
                    marginTop: '32px',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    maxWidth: '300px',
                    margin: '32px auto 0'
                  }}>
                    <div style={{
                      height: '100%',
                      background: step.gradient,
                      borderRadius: '2px',
                      animation: 'progressBar 5s linear',
                      transformOrigin: 'left'
                    }}></div>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          style={{
            position: 'absolute',
            left: '-60px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '24px',
            cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: activeIndex === 0 ? 0.3 : 1,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            if (activeIndex !== 0) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
          }}
        >
          ←
        </button>

        <button
          onClick={() => setActiveIndex(Math.min(steps.length - 1, activeIndex + 1))}
          disabled={activeIndex === steps.length - 1}
          style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '24px',
            cursor: activeIndex === steps.length - 1 ? 'not-allowed' : 'pointer',
            opacity: activeIndex === steps.length - 1 ? 0.3 : 1,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            if (activeIndex !== steps.length - 1) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
          }}
        >
          →
        </button>
      </div>

      {/* Dot Indicators */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '40px'
      }}>
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            style={{
              width: activeIndex === index ? '40px' : '12px',
              height: '12px',
              borderRadius: '6px',
              background: activeIndex === index
                ? step.gradient
                : 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeIndex === index
                ? `0 4px 12px ${step.color}66`
                : 'none'
            }}
            onMouseOver={(e) => {
              if (activeIndex !== index) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              if (activeIndex !== index) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }
            }}
          />
        ))}
      </div>

      {/* CTA Button */}
      <div style={{ textAlign: 'center', marginTop: '56px' }}>
        <a
          href="/get-started"
          className="btn btn-primary"
          style={{
            padding: '16px 40px',
            fontSize: '18px',
            fontWeight: '700',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)'
          }}
        >
          Start Your Free Trial
        </a>
      </div>

      {/* CSS Animation for Progress Bar */}
      <style>{`
        @keyframes progressBar {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        @media (max-width: 768px) {
          .section.container {
            padding: 60px 16px !important;
          }
        }
      `}</style>
    </section>
  )
}
